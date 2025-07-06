import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { notifyTaskAssigned, createNotification } from '../utils/notificationService.js';

// Create new task
export const createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, dueDate, priority, estimatedHours, tags, checklist } = req.body;

    // Validate required fields
    if (!title || !description || !project || !assignedTo || !dueDate) {
      return res.status(400).json({ message: 'Title, description, project, assignedTo, and dueDate are required' });
    }

    // Validate project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate assigned user exists and is active
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || !assignedUser.isActive) {
      return res.status(404).json({ message: 'Assigned user not found or inactive' });
    }

    // Validate due date is not in the past
    if (new Date(dueDate) < new Date()) {
      return res.status(400).json({ message: 'Due date cannot be in the past' });
    }

    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user._id,
      dueDate,
      priority: priority || 'medium',
      estimatedHours: estimatedHours || 0,
      tags: tags || [],
      checklist: checklist || []
    });

    // Add activity log entry
    task.activityLog.push({
      action: 'created',
      user: req.user._id,
      details: { priority, estimatedHours }
    });

    await task.save();

    // Add task to project
    projectDoc.tasks.push(task._id);
    await projectDoc.save();

    // Add task to user's assigned tasks
    assignedUser.assignedTasks.push(task._id);
    await assignedUser.save();

    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    // Send notification
    await notifyTaskAssigned(task._id, assignedTo, title, req.user.name);

    // Create audit log
    await createAuditLog(req, 'TASK_CREATE', 'Task', task._id);

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('❌ Create task error:', error);
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
};

// Accept task
export const acceptTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (!task.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only accept tasks assigned to you' });
    }

    if (task.isAccepted) {
      return res.status(400).json({ message: 'Task is already accepted' });
    }

    task.isAccepted = true;
    task.acceptedAt = new Date();
    
    // Add activity log entry
    task.activityLog.push({
      action: 'accepted',
      user: req.user._id,
      details: {}
    });

    await task.save();

    // Notify task creator
    await createNotification(
      task.createdBy,
      'TASK_ACCEPTED',
      'Task Accepted',
      `${req.user.name} accepted the task: ${task.title}`,
      { taskId: task._id, type: 'task' }
    );

    // Create audit log
    await createAuditLog(req, 'TASK_ACCEPT', 'Task', task._id);

    res.json({
      message: 'Task accepted successfully',
      task
    });
  } catch (error) {
    console.error('❌ Accept task error:', error);
    res.status(500).json({ message: 'Failed to accept task', error: error.message });
  }
};

// Update task status (NEW ROUTE)
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (!task.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only update status of tasks assigned to you' });
    }

    // Validate status
    const validStatuses = ['todo', 'in-progress', 'blocked', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const oldStatus = task.status;
    task.status = status;

    // Add activity log entry
    task.activityLog.push({
      action: 'status_changed',
      user: req.user._id,
      details: { from: oldStatus, to: status }
    });

    await task.save();

    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    // Notify task creator if status changed to completed
    if (status === 'completed') {
      await createNotification(
        task.createdBy,
        'TASK_COMPLETED',
        'Task Completed',
        `${req.user.name} completed the task: ${task.title}`,
        { taskId: task._id, type: 'task' }
      );
    }

    // Create audit log
    await createAuditLog(req, 'TASK_STATUS_UPDATE', 'Task', task._id, { from: oldStatus, to: status });

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('❌ Update task status error:', error);
    res.status(500).json({ message: 'Failed to update task status', error: error.message });
  }
};

// Log time worked (NEW ROUTE)
export const logTaskTime = async (req, res) => {
  try {
    const { hoursToAdd } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (!task.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only log time for tasks assigned to you' });
    }

    // Validate hours
    const hours = parseFloat(hoursToAdd);
    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ message: 'Hours must be a positive number' });
    }

    // Add hours to actual hours
    task.actualHours = (task.actualHours || 0) + hours;

    // Add activity log entry
    task.activityLog.push({
      action: 'time_logged',
      user: req.user._id,
      details: { hoursAdded: hours, totalHours: task.actualHours }
    });

    await task.save();

    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    // Create audit log
    await createAuditLog(req, 'TASK_TIME_LOG', 'Task', task._id, { hoursAdded: hours });

    res.json({
      message: 'Time logged successfully',
      task
    });
  } catch (error) {
    console.error('❌ Log task time error:', error);
    res.status(500).json({ message: 'Failed to log time', error: error.message });
  }
};

// Update task checklist
export const updateChecklist = async (req, res) => {
  try {
    const { checklistItems } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'admin' || 
                   task.assignedTo.equals(req.user._id) || 
                   task.createdBy.equals(req.user._id);
    
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.checklist = checklistItems.map(item => ({
      ...item,
      completedBy: item.completed ? req.user._id : undefined,
      completedAt: item.completed ? new Date() : undefined
    }));

    await task.save();

    res.json({
      message: 'Checklist updated successfully',
      task
    });
  } catch (error) {
    console.error('❌ Update checklist error:', error);
    res.status(500).json({ message: 'Failed to update checklist', error: error.message });
  }
};

// Get all tasks
export const getTasks = async (req, res) => {
  try {
    const { status, priority, project, assignedTo, search, page = 1, limit = 20, accepted } = req.query;
    const query = {};

    // Build query filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
    if (accepted !== undefined) query.isAccepted = accepted === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // For employees, only show their assigned tasks
    if (req.user.role === 'employee') {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('project', 'name status priority')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Fetch tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
  }
};

// Get single task
export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name status priority manager team')
      .populate('assignedTo', 'name email avatar department position')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('activityLog.user', 'name email avatar')
      .populate('checklist.completedBy', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role === 'employee') {
      const hasAccess = task.assignedTo._id.equals(req.user._id) ||
                       task.createdBy._id.equals(req.user._id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ task });
  } catch (error) {
    console.error('❌ Fetch task error:', error);
    res.status(500).json({ message: 'Failed to fetch task', error: error.message });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'admin' || 
                   task.assignedTo.equals(req.user._id) || 
                   task.createdBy.equals(req.user._id);
    
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updates = req.body;
    const oldStatus = task.status;

    // Employees can only update certain fields
    if (req.user.role === 'employee' && !task.assignedTo.equals(req.user._id)) {
      const allowedFields = ['actualHours'];
      const updateKeys = Object.keys(updates);
      const hasDisallowedField = updateKeys.some(key => !allowedFields.includes(key));
      
      if (hasDisallowedField) {
        return res.status(403).json({ message: 'You can only update allowed fields' });
      }
    }

    Object.assign(task, updates);

    // Add activity log entry for status changes
    if (oldStatus !== task.status) {
      task.activityLog.push({
        action: 'status_changed',
        user: req.user._id,
        details: { from: oldStatus, to: task.status }
      });
    }

    await task.save();

    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    // Create audit log
    await createAuditLog(req, 'TASK_UPDATE', 'Task', task._id, updates);

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('❌ Update task error:', error);
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
};

// Add comment to task with mentions
export const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    // Extract mentions from comment text (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const user = await User.findOne({ name: { $regex: username, $options: 'i' } });
      if (user) {
        mentions.push(user._id);
      }
    }

    const comment = {
      user: req.user._id,
      text,
      mentions,
      createdAt: new Date()
    };

    task.comments.push(comment);
    
    // Add activity log entry
    task.activityLog.push({
      action: 'commented',
      user: req.user._id,
      details: { commentLength: text.length, mentions: mentions.length }
    });

    await task.save();

    await task.populate('comments.user', 'name email avatar');

    // Send notifications to mentioned users
    for (const mentionedUserId of mentions) {
      await createNotification(
        mentionedUserId,
        'COMMENT_MENTION',
        'You were mentioned',
        `${req.user.name} mentioned you in a comment on "${task.title}"`,
        { taskId: task._id, type: 'task' }
      );
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: task.comments[task.comments.length - 1]
    });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// Delete task
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions - only admin or task creator can delete
    if (req.user.role !== 'admin' && !task.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    // Remove task from project
    await Project.findByIdAndUpdate(
      task.project,
      { $pull: { tasks: task._id } }
    );

    // Remove task from user's assigned tasks
    await User.findByIdAndUpdate(
      task.assignedTo,
      { $pull: { assignedTasks: task._id } }
    );

    await Task.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(req, 'TASK_DELETE', 'Task', req.params.id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('❌ Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
};