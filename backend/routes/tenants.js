import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getTenants,
  createTenant,
  getTenant,
  updateTenant,
  deleteTenant,
  activateTenant,
  getTenantStats
} from '../controllers/tenantController.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors: errors.array() 
    });
  }
  next();
};

// Get all tenants (Admin only)
router.get('/', authenticateToken, requireAdmin, getTenants);

// Get tenant statistics (Admin only)
router.get('/stats', authenticateToken, requireAdmin, getTenantStats);

// Get single tenant (Admin only)
router.get('/:id', authenticateToken, requireAdmin, getTenant);

// Create new tenant (Admin only)
router.post('/', authenticateToken, requireAdmin, [
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
  body('contactNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Valid contact number required'),
  body('roomNumber')
    .optional()
    .trim(),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim()
], validateRequest, createTenant);

// Update tenant (Admin only)
router.put('/:id', authenticateToken, requireAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('contactNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Valid contact number required'),
  body('roomNumber')
    .optional()
    .trim(),
  body('department')
    .optional()
    .trim(),
  body('position')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], validateRequest, updateTenant);

// Activate tenant (Admin only)
router.patch('/:id/activate', authenticateToken, requireAdmin, activateTenant);

// Delete/Deactivate tenant (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteTenant);

export default router;