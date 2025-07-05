import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';

const router = express.Router();

// Add error handling middleware for this router
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get all projects
router.get('/', authenticateToken, asyncHandler(getProjects));

// Get single project
router.get('/:id', authenticateToken, asyncHandler(getProject));

// Create new project (Admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('budget').optional().isNumeric().withMessage('Budget must be a number'),
  body('team').optional().isArray().withMessage('Team must be an array')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, asyncHandler(createProject));

// Update project (Admin only)
router.put('/:id', authenticateToken, requireAdmin, [
  body('name').optional().trim().isLength({ min: 3 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('budget').optional().isNumeric(),
  body('team').optional().isArray()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}, asyncHandler(updateProject));

// Delete project (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(deleteProject));

export default router;