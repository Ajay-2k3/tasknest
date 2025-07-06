import User from '../models/User.js';
import { createAuditLog } from '../middleware/auditLog.js';

// Create user (Admin only)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, position } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'employee',
      department: department || '',
      position: position || ''
    });

    await user.save();

    // Create audit log
    await createAuditLog(req, 'USER_CREATE', 'User', user._id, { 
      createdByAdmin: true,
      role: user.role 
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

// Get admin dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin', isActive: true });
    const employeeUsers = await User.countDocuments({ role: 'employee', isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    res.json({
      users: {
        total: totalUsers,
        admins: adminUsers,
        employees: employeeUsers,
        inactive: inactiveUsers
      }
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};