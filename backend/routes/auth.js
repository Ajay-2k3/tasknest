import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  inviteUser,
  acceptInvite,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
  logout,
  deleteAccount
} from '../controllers/authController.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 🔐 Login with refresh token
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], validateRequest, login);

// 🔄 Refresh token
router.post('/refresh', refreshToken);

// 📧 Forgot password
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
], validateRequest, forgotPassword);

// 🔑 Reset password
router.post('/reset-password', authLimiter, [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validateRequest, resetPassword);

// 📨 Send user invite (Admin only)
router.post('/invite-user', authenticateToken, requireAdmin, [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').isIn(['admin', 'employee']).withMessage('Invalid role'),
], validateRequest, inviteUser);

// ✅ Accept invite and register
router.post('/accept-invite', [
  body('token').notEmpty().withMessage('Invite token required'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validateRequest, acceptInvite);

// 👤 Profile routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, [
  body('name').optional().isLength({ min: 2 }),
  body('department').optional(),
  body('position').optional()
], validateRequest, updateProfile);

// 🔐 Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], validateRequest, changePassword);

// ✅ Token Verification
router.get('/verify', authenticateToken, verifyToken);

// 🚪 Logout
router.post('/logout', authenticateToken, logout);

// 🗑️ Delete Account
router.delete('/account', authenticateToken, [
  body('password').notEmpty().withMessage('Password required'),
], validateRequest, deleteAccount);

export default router;