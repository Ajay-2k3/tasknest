import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin, requireEmployee } from '../middleware/auth.js';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  addComment,
  deleteTask,
  acceptTask,
  updateChecklist,
  updateTaskStatus
} from '../controllers/taskController.js';

const router = express.Router();

// Get all tasks
router.get('/', authenticateToken, getTasks);

// Get single task
router.get('/:id', authenticateToken, getTask);

// Create new task (Admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('title').trim().isLength({ min: 3 }).withMessage('Task title must be at least 3 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('project').isMongoId().withMessage('Valid project ID required'),
  body('assignedTo').isMongoId().withMessage('Valid assigned user ID required'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be positive')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, createTask);

// Accept task
router.patch('/:id/accept', authenticateToken, requireEmployee, acceptTask);

// Update task status (ONLY for assigned team members)
router.patch('/:id/status', authenticateToken, requireEmployee, [
  body('status')
    .isIn(['todo', 'in-progress', 'review', 'completed'])
    .withMessage('Status must be one of: todo, in-progress, review, completed')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, updateTaskStatus);

// Update task
router.put('/:id', authenticateToken, requireEmployee, [
  body('title').optional().trim().isLength({ min: 3 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601(),
  body('actualHours').optional().isFloat({ min: 0 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, updateTask);

// Update task checklist
router.patch('/:id/checklist', authenticateToken, requireEmployee, [
  body('checklistItems').isArray().withMessage('Checklist items must be an array'),
  body('checklistItems.*.text').trim().isLength({ min: 1 }).withMessage('Checklist item text is required'),
  body('checklistItems.*.completed').optional().isBoolean()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, updateChecklist);

// Add comment to task
router.post('/:id/comments', authenticateToken, requireEmployee, [
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, addComment);

// Delete task (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteTask);

// Add time tracking endpoint - ONLY for assigned users
router.patch('/:id/time', authenticateToken, requireEmployee, [
  body('hours')
    .isFloat({ min: 0.1 })
    .withMessage('Hours must be a positive number greater than 0')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, async (req, res) => {
  try {
    const { hours } = req.body;
    const taskId = req.params.id;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // SECURITY: Only assigned user can track time
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only the assigned team member can track time on this task' 
      });
    }

    // Don't allow time tracking on completed tasks
    if (task.status === 'completed') {
      return res.status(400).json({ 
        message: 'Cannot track time on completed tasks' 
      });
    }

    // Add time to actual hours
    task.actualHours += parseFloat(hours);
    
    // Add activity log entry
    task.activityLog.push({
      action: 'time_added',
      user: req.user._id,
      details: { 
        hoursAdded: parseFloat(hours),
        totalHours: task.actualHours
      }
    });

    await task.save();

    // Populate task data for response
    await task.populate('project', 'name status priority');
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    // Create audit log
    await createAuditLog(req, 'TIME_TRACKED', 'Task', task._id, { 
      hoursAdded: parseFloat(hours),
      totalActualHours: task.actualHours
    });

    res.json({
      message: 'Time tracked successfully',
      task,
      hoursAdded: parseFloat(hours)
    });
  } catch (error) {
    console.error('❌ Time tracking error:', error);
    res.status(500).json({ 
      message: 'Failed to track time', 
      error: error.message 
    });
  }
});

export default router;