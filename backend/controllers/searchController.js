import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// Global search
export const globalSearch = async (req, res) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchQuery = q.trim();
    const searchRegex = { $regex: searchQuery, $options: 'i' };
    const results = {};

    // Build base queries based on user role
    let taskQuery = {};
    let projectQuery = {};
    let userQuery = {};

    if (req.user.role === 'employee') {
      taskQuery = {
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      };
      projectQuery = {
        $or: [
          { team: req.user._id },
          { manager: req.user._id }
        ]
      };
    }

    // Search tasks
    if (type === 'all' || type === 'tasks') {
      const taskSearchQuery = {
        ...taskQuery,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      };

      results.tasks = await Task.find(taskSearchQuery)
        .populate('project', 'name')
        .populate('assignedTo', 'name avatar')
        .select('title description status priority dueDate project assignedTo')
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    }

    // Search projects
    if (type === 'all' || type === 'projects') {
      const projectSearchQuery = {
        ...projectQuery,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      };

      results.projects = await Project.find(projectSearchQuery)
        .populate('manager', 'name avatar')
        .select('name description status priority progress manager')
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    }

    // Search users (admin only)
    if (req.user.role === 'admin' && (type === 'all' || type === 'users')) {
      const userSearchQuery = {
        ...userQuery,
        isActive: true,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { department: searchRegex },
          { position: searchRegex }
        ]
      };

      results.users = await User.find(userSearchQuery)
        .select('name email role department position avatar')
        .limit(parseInt(limit))
        .sort({ name: 1 });
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    res.json({
      query: searchQuery,
      totalResults,
      results
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

// Get search suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchQuery = q.trim();
    const searchRegex = { $regex: searchQuery, $options: 'i' };
    const suggestions = [];

    // Get task titles
    const tasks = await Task.find({
      title: searchRegex,
      ...(req.user.role === 'employee' ? {
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      } : {})
    })
    .select('title')
    .limit(5);

    tasks.forEach(task => {
      suggestions.push({
        type: 'task',
        text: task.title,
        id: task._id
      });
    });

    // Get project names
    const projects = await Project.find({
      name: searchRegex,
      ...(req.user.role === 'employee' ? {
        $or: [
          { team: req.user._id },
          { manager: req.user._id }
        ]
      } : {})
    })
    .select('name')
    .limit(5);

    projects.forEach(project => {
      suggestions.push({
        type: 'project',
        text: project.name,
        id: project._id
      });
    });

    // Get user names (admin only)
    if (req.user.role === 'admin') {
      const users = await User.find({
        name: searchRegex,
        isActive: true
      })
      .select('name')
      .limit(3);

      users.forEach(user => {
        suggestions.push({
          type: 'user',
          text: user.name,
          id: user._id
        });
      });
    }

    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Failed to get suggestions', error: error.message });
  }
};