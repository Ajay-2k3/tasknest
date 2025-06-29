import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// Create new task
export const createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, dueDate, priority, estimatedHours, tags } = req.body;

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
      tags: tags || []
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

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
};

// Get all tasks
export const getTasks = async (req, res) => {
  try {
    const { status, priority, project, assignedTo, search, page = 1, limit = 20 } = req.query;
    const query = {};

    // Build query filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
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
    console.error('Fetch tasks error:', error);
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
      .populate('comments.user', 'name email avatar');

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
    console.error('Fetch task error:', error);
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
    await task.save();

    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
};

// Add comment to task
export const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = {
      user: req.user._id,
      text: req.body.text,
      createdAt: new Date()
    };

    task.comments.push(comment);
    await task.save();

    await task.populate('comments.user', 'name email avatar');

    res.status(201).json({
      message: 'Comment added successfully',
      comment: task.comments[task.comments.length - 1]
    });
  } catch (error) {
    console.error('Add comment error:', error);
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

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
};