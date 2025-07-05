import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import PasswordReset from '../models/PasswordReset.js';
import UserInvite from '../models/UserInvite.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { sendPasswordResetEmail, sendUserInviteEmail } from '../utils/emailService.js';

const router = express.Router();

// JWT token generators
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  
  await RefreshToken.create({
    token,
    user: userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  return token;
};

// 🔐 Login with refresh token
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // Create audit log
    await createAuditLog(
      { user, ip: req.ip, get: req.get.bind(req) },
      'LOGIN',
      'User',
      user._id
    );

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// 🔄 Refresh token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const tokenDoc = await RefreshToken.findOne({ 
      token: refreshToken, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('user');

    if (!tokenDoc) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    if (!tokenDoc.user.isActive) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(tokenDoc.user._id);

    res.json({
      accessToken,
      user: tokenDoc.user.toJSON()
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// 📧 Forgot password
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const user = await User.findOne({ email, isActive: true });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists, a reset email has been sent' });
    }

    // Invalidate existing reset tokens
    await PasswordReset.updateMany(
      { user: user._id, isUsed: false },
      { isUsed: true }
    );

    // Create new reset token
    const resetToken = new PasswordReset({ user: user._id });
    resetToken.generateToken();
    await resetToken.save();

    // Send email
    await sendPasswordResetEmail(email, resetToken.token);

    res.json({ message: 'If an account exists, a reset email has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Password reset request failed' });
  }
});

// 🔑 Reset password
router.post('/reset-password', authLimiter, [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { token, password } = req.body;

  try {
    const resetToken = await PasswordReset.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).populate('user');

    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    resetToken.user.password = password;
    await resetToken.user.save();

    // Mark token as used
    resetToken.isUsed = true;
    await resetToken.save();

    // Invalidate all refresh tokens for this user
    await RefreshToken.updateMany(
      { user: resetToken.user._id },
      { isActive: false }
    );

    // Create audit log
    await createAuditLog(
      { user: resetToken.user, ip: req.ip, get: req.get.bind(req) },
      'PASSWORD_RESET',
      'User',
      resetToken.user._id
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
});

// 📨 Send user invite (Admin only)
router.post('/invite-user', authenticateToken, requireAdmin, [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').isIn(['admin', 'employee']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role, department, position } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check for existing unused invite
    const existingInvite = await UserInvite.findOne({ 
      email, 
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (existingInvite) {
      return res.status(400).json({ message: 'Invitation already sent to this email' });
    }

    // Create invite
    const invite = new UserInvite({
      email,
      role,
      department,
      position,
      invitedBy: req.user._id
    });
    
    invite.generateToken();
    await invite.save();

    // Send email
    await sendUserInviteEmail(email, invite.token, req.user.name);

    // Create audit log
    await createAuditLog(req, 'USER_INVITE', 'UserInvite', invite._id, { email, role });

    res.status(201).json({ message: 'User invitation sent successfully' });
  } catch (error) {
    console.error('User invite error:', error);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// ✅ Accept invite and register
router.post('/accept-invite', [
  body('token').notEmpty().withMessage('Invite token required'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { token, name, password } = req.body;

  try {
    const invite = await UserInvite.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!invite) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({
      name,
      email: invite.email,
      password,
      role: invite.role,
      department: invite.department,
      position: invite.position
    });

    await user.save();

    // Mark invite as used
    invite.isUsed = true;
    await invite.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // Create audit log
    await createAuditLog(
      { user, ip: req.ip, get: req.get.bind(req) },
      'USER_CREATE',
      'User',
      user._id,
      { inviteAccepted: true }
    );

    res.status(201).json({
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ message: 'Failed to accept invitation' });
  }
});

// 👤 Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('assignedTasks', 'title status priority dueDate')
      .populate('createdProjects', 'name status progress');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('❌ Profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
});

// ✏️ Update Profile
router.put('/profile', authenticateToken, [
  body('name').optional().isLength({ min: 2 }),
  body('department').optional(),
  body('position').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, department, position, avatar } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Create audit log
    await createAuditLog(req, 'USER_UPDATE', 'User', user._id, { profileUpdate: true });

    res.json({ message: 'Profile updated', user: user.toJSON() });
  } catch (err) {
    console.error('❌ Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});

// 🔐 Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens
    await RefreshToken.updateMany(
      { user: user._id },
      { isActive: false }
    );

    // Create audit log
    await createAuditLog(req, 'PASSWORD_CHANGE', 'User', user._id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// ✅ Token Verification
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 🚪 Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await RefreshToken.updateOne(
        { token: refreshToken },
        { isActive: false }
      );
    }

    // Create audit log
    await createAuditLog(req, 'LOGOUT', 'User', req.user._id);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default router;