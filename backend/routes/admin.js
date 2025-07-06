import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { getDashboardStats } from '../controllers/adminController.js';

const router = express.Router();

// Middleware to validate request fields
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

// Admin-only route to create users
router.post('/create-user', authenticateToken, requireAdmin, [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['admin', 'employee'])
    .withMessage('Invalid role'),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim()
], validateRequest, async (req, res) => {
  try {
    const { name, email, password, role, department, position } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      department: department || '',
      position: position || ''
    });

    await user.save();

    // Create audit log
    await createAuditLog(req, 'USER_CREATE', 'User', user._id, {
      createdByAdmin: true,
      role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position
      }
    });
  } catch (error) {
    console.error('❌ Admin create user error:', error);
    res.status(500).json({
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Admin-only dashboard stats
router.get('/dashboard-stats', authenticateToken, requireAdmin, getDashboardStats);

export default router;
