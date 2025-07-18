import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { createAuditLog } from '../middleware/auditLog.js';

// Create new project
export const createProject = async (req, res) => {
  try {
    const { name, description, startDate, endDate, priority, budget, team, tags } = req.body;

    // Validate required fields
    if (!name || !description || !startDate || !endDate) {
      return res.status(400).json({ message: 'Name, description, start date, and end date are required' });
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate team members if provided
    if (team && team.length > 0) {
      const validTeam = await User.find({ _id: { $in: team }, isActive: true });
      if (validTeam.length !== team.length) {
        return res.status(400).json({ message: 'Some team members are invalid or inactive' });
      }
    }

    const project = new Project({
      name,
      description,
      startDate,
      endDate,
      priority: priority || 'medium',
      budget: budget || 0,
      manager: req.user._id,
      team: team || [],
      tags: tags || []
    });

    await project.save();

    // Update user's created projects
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { createdProjects: project._id } }
    );

    await project.populate('manager', 'name email avatar');
    await project.populate('team', 'name email avatar role');

    // Create audit log
    await createAuditLog(req, 'PROJECT_CREATE', 'Project', project._id);

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('❌ Create project error:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    console.log('📋 Fetching projects for user:', req.user?.email);
    
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Build query filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // For employees, only show projects they're part of
    if (req.user.role === 'employee') {
      query.$or = [
        { team: req.user._id },
        { manager: req.user._id }
      ];
    }

    console.log('🔍 Project query:', JSON.stringify(query, null, 2));

    const projects = await Project.find(query)
      .populate('manager', 'name email avatar')
      .populate('team', 'name email avatar role')
      .populate('tasks', 'title status priority dueDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    console.log(`✅ Found ${projects.length} projects`);

    res.json({
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Fetch projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
};

// Get single project by ID
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Fetching project by ID:', id);

    if (!id) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const project = await Project.findById(id)
      .populate('manager', 'name email avatar department position')
      .populate('team', 'name email avatar role department position')
      .populate({
        path: 'tasks',
        populate: {
          path: 'assignedTo createdBy',
          select: 'name email avatar'
        }
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role === 'employee') {
      const hasAccess = project.team.some(member => member._id.equals(req.user._id)) ||
                       project.manager._id.equals(req.user._id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    console.log('✅ Project found:', project.name);

    res.json({ project });
  } catch (error) {
    console.error('❌ Fetch project by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid project ID format' });
    }

    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
};

// Get single project (alias for backward compatibility)
export const getProject = getProjectById;

// Update project
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions - only admin or project manager can update
    if (req.user.role !== 'admin' && !project.manager.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const updates = req.body;

    // Validate date changes
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || project.startDate);
      const endDate = new Date(updates.endDate || project.endDate);
      if (endDate <= startDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    // Validate team members if updating
    if (updates.team) {
      const validTeam = await User.find({ _id: { $in: updates.team }, isActive: true });
      if (validTeam.length !== updates.team.length) {
        return res.status(400).json({ message: 'Some team members are invalid or inactive' });
      }
    }

    Object.assign(project, updates);
    await project.save();

    await project.populate('manager', 'name email avatar');
    await project.populate('team', 'name email avatar role');

    // Create audit log
    await createAuditLog(req, 'PROJECT_UPDATE', 'Project', project._id, updates);

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('❌ Update project error:', error);
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions - only admin can delete projects
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete projects' });
    }

    // Delete all associated tasks
    await Task.deleteMany({ project: project._id });

    // Remove project references from users
    await User.updateMany(
      { createdProjects: project._id },
      { $pull: { createdProjects: project._id } }
    );

    await Project.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(req, 'PROJECT_DELETE', 'Project', req.params.id);

    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
};

// Get admin's created tasks
export const getMyTasks = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const query = { createdBy: req.user._id };

    // Build query filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
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
    console.error('❌ Fetch my tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
  }
};