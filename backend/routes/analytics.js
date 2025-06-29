import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
    let taskQuery = {};
    let projectQuery = {};

    // For employees, only show their data
    if (!isAdmin) {
      taskQuery.assignedTo = req.user._id;
      projectQuery.$or = [
        { team: req.user._id },
        { manager: req.user._id }
      ];
    }

    // Basic counts
    const totalTasks = await Task.countDocuments(taskQuery);
    const completedTasks = await Task.countDocuments({ ...taskQuery, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ ...taskQuery, status: 'in-progress' });
    const overdueTasks = await Task.countDocuments({
      ...taskQuery,
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    });

    const totalProjects = await Project.countDocuments(projectQuery);
    const activeProjects = await Project.countDocuments({ ...projectQuery, status: 'active' });

    // Task status distribution
    const taskStatusData = await Task.aggregate([
      { $match: taskQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Task priority distribution
    const taskPriorityData = await Task.aggregate([
      { $match: taskQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Recent tasks
    const recentTasks = await Task.find(taskQuery)
      .populate('project', 'name')
      .populate('assignedTo', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    // Team performance (admin only)
    let teamPerformance = [];
    if (isAdmin) {
      teamPerformance = await User.aggregate([
        { $match: { role: 'employee', isActive: true } },
        {
          $lookup: {
            from: 'tasks',
            localField: '_id',
            foreignField: 'assignedTo',
            as: 'tasks'
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            totalTasks: { $size: '$tasks' },
            completedTasks: {
              $size: {
                $filter: {
                  input: '$tasks',
                  cond: { $eq: ['$$this.status', 'completed'] }
                }
              }
            },
            avgHours: { $avg: '$tasks.actualHours' }
          }
        },
        {
          $addFields: {
            completionRate: {
              $cond: {
                if: { $gt: ['$totalTasks', 0] },
                then: { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
                else: 0
              }
            }
          }
        },
        { $sort: { completionRate: -1 } },
        { $limit: 10 }
      ]);
    }

    // Weekly task completion trend
    const weeklyData = await Task.aggregate([
      {
        $match: {
          ...taskQuery,
          completedAt: {
            $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$completedAt' },
            year: { $year: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalProjects,
        activeProjects,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      charts: {
        taskStatus: taskStatusData,
        taskPriority: taskPriorityData,
        weeklyCompletion: weeklyData
      },
      recentTasks,
      teamPerformance: isAdmin ? teamPerformance : []
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Get project analytics
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let query = {};

    if (!isAdmin) {
      query.$or = [
        { team: req.user._id },
        { manager: req.user._id }
      ];
    }

    // Project status distribution
    const projectStatusData = await Project.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Project priority distribution
    const projectPriorityData = await Project.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Projects by progress
    const projectProgressData = await Project.aggregate([
      { $match: query },
      {
        $bucket: {
          groupBy: '$progress',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'Unknown',
          output: {
            count: { $sum: 1 },
            projects: { $push: { name: '$name', progress: '$progress' } }
          }
        }
      }
    ]);

    res.json({
      charts: {
        projectStatus: projectStatusData,
        projectPriority: projectPriorityData,
        projectProgress: projectProgressData
      }
    });
  } catch (error) {
    console.error('Project analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch project analytics', error: error.message });
  }
});

// Get user workload analytics (admin only)
router.get('/workload', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const workloadData = await User.aggregate([
      { $match: { role: 'employee', isActive: true } },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'tasks'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          department: 1,
          totalTasks: { $size: '$tasks' },
          todoTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'todo'] }
              }
            }
          },
          inProgressTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'in-progress'] }
              }
            }
          },
          completedTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          estimatedHours: { $sum: '$tasks.estimatedHours' },
          actualHours: { $sum: '$tasks.actualHours' },
          overdueTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: {
                  $and: [
                    { $ne: ['$$this.status', 'completed'] },
                    { $lt: ['$$this.dueDate', new Date()] }
                  ]
                }
              }
            }
          }
        }
      },
      { $sort: { totalTasks: -1 } }
    ]);

    res.json({ workloadData });
  } catch (error) {
    console.error('Workload analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch workload analytics', error: error.message });
  }
});

export default router;