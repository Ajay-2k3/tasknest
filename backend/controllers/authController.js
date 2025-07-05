import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import PasswordReset from '../models/PasswordReset.js';
import UserInvite from '../models/UserInvite.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { sendPasswordResetEmail, sendUserInviteEmail } from '../utils/emailService.js';

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
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

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
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// 🔄 Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

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
};

// 📧 Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

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
};

// 🔑 Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

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
};

// 📨 Send user invite (Admin only)
export const inviteUser = async (req, res) => {
  try {
    const { email, role, department, position } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

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
};

// ✅ Accept invite and register
export const acceptInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ message: 'Token, name, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

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
};

// 👤 Get Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('assignedTasks', 'title status priority dueDate')
      .populate('createdProjects', 'name status progress');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

// ✏️ Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, department, position, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // Create audit log
    await createAuditLog(req, 'USER_UPDATE', 'User', user._id, { profileUpdate: true });

    res.json({ message: 'Profile updated', user: user.toJSON() });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// 🔐 Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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
};

// ✅ Token Verification
export const verifyToken = async (req, res) => {
  res.json({ valid: true, user: req.user });
};

// 🚪 Logout
export const logout = async (req, res) => {
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
};

// 🗑️ Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Deactivate instead of delete to preserve data integrity
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    // Invalidate all refresh tokens
    await RefreshToken.updateMany(
      { user: user._id },
      { isActive: false }
    );

    // Create audit log
    await createAuditLog(req, 'USER_DELETE', 'User', user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};