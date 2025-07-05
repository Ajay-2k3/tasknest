import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createUser, getDashboardStats } from '../controllers/adminController.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: errors.array() 
    });
  }
  next();
};

// Create user (Admin only)
router.post('/create-user', authenticateToken, requireAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'employee']).withMessage('Invalid role'),
  body('department').optional().trim(),
  body('position').optional().trim()
], validateRequest, createUser);

// Get dashboard stats
router.get('/dashboard-stats', authenticateToken, requireAdmin, getDashboardStats);

export default router;