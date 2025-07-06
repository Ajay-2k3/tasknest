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
  updateTaskStatus,
  logTaskTime
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

// Update task status (NEW ROUTE - Team members only)
router.patch('/:id/status', authenticateToken, requireEmployee, [
  body('status').isIn(['todo', 'in-progress', 'blocked', 'completed']).withMessage('Invalid status value')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, updateTaskStatus);

// Log time worked (NEW ROUTE - Team members only)
router.patch('/:id/time', authenticateToken, requireEmployee, [
  body('hoursToAdd').isFloat({ min: 0.1 }).withMessage('Hours must be a positive number')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, logTaskTime);

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
  body('checklistItems').isArray().withMessage('Checklist items must be an array')
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

export default router;