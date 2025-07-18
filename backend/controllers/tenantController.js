import User from '../models/User.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { createNotification } from '../utils/notificationService.js';

// Get all tenants (Admin only)
export const getTenants = async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;
    const query = { role: 'employee' }; // Tenants are employees in this system

    // Build query filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const tenants = await User.find(query)
      .select('-password')
      .populate('assignedTasks', 'title status priority dueDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      tenants,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Get tenants error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tenants', 
      error: error.message 
    });
  }
};

// Create new tenant (Admin only)
export const createTenant = async (req, res) => {
  try {
    const { name, email, password, contactNumber, roomNumber, department, position } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create tenant
    const tenant = new User({
      name,
      email,
      password,
      role: 'employee', // Tenants are employees
      department: department || 'General',
      position: position || 'Tenant',
      contactNumber,
      roomNumber
    });

    await tenant.save();

    // Create notification for the new tenant
    await createNotification(
      tenant._id,
      'USER_INVITED',
      'Welcome to TaskNest',
      `Welcome ${name}! Your account has been created successfully.`,
      { type: 'welcome' }
    );

    // Create audit log
    await createAuditLog(req, 'USER_CREATE', 'User', tenant._id, { 
      createdByAdmin: true,
      role: 'employee',
      type: 'tenant'
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        email: tenant.email,
        role: tenant.role,
        department: tenant.department,
        position: tenant.position,
        contactNumber: tenant.contactNumber,
        roomNumber: tenant.roomNumber,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Create tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create tenant', 
      error: error.message 
    });
  }
};

// Get single tenant by ID
export const getTenant = async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id)
      .select('-password')
      .populate('assignedTasks', 'title status priority dueDate project')
      .populate('createdProjects', 'name status progress startDate endDate');

    if (!tenant || tenant.role !== 'employee') {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    res.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('❌ Get tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tenant', 
      error: error.message 
    });
  }
};

// Update tenant
export const updateTenant = async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id);
    if (!tenant || tenant.role !== 'employee') {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    const updates = req.body;

    // Check if email is being updated and if it's already taken
    if (updates.email && updates.email !== tenant.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already in use' 
        });
      }
    }

    // Update tenant
    Object.assign(tenant, updates);
    await tenant.save();

    // Create audit log
    await createAuditLog(req, 'USER_UPDATE', 'User', tenant._id, updates);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        email: tenant.email,
        role: tenant.role,
        department: tenant.department,
        position: tenant.position,
        contactNumber: tenant.contactNumber,
        roomNumber: tenant.roomNumber,
        isActive: tenant.isActive
      }
    });
  } catch (error) {
    console.error('❌ Update tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update tenant', 
      error: error.message 
    });
  }
};

// Delete tenant (Deactivate)
export const deleteTenant = async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id);
    if (!tenant || tenant.role !== 'employee') {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    // Don't allow deleting self
    if (tenant._id.equals(req.user._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    // Deactivate instead of delete to preserve data integrity
    tenant.isActive = false;
    await tenant.save();

    // Create audit log
    await createAuditLog(req, 'USER_DEACTIVATE', 'User', tenant._id);

    res.json({
      success: true,
      message: 'Tenant deactivated successfully'
    });
  } catch (error) {
    console.error('❌ Delete tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete tenant', 
      error: error.message 
    });
  }
};

// Activate tenant
export const activateTenant = async (req, res) => {
  try {
    const tenant = await User.findById(req.params.id);
    if (!tenant || tenant.role !== 'employee') {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    tenant.isActive = true;
    await tenant.save();

    // Create audit log
    await createAuditLog(req, 'USER_ACTIVATE', 'User', tenant._id);

    res.json({
      success: true,
      message: 'Tenant activated successfully'
    });
  } catch (error) {
    console.error('❌ Activate tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to activate tenant', 
      error: error.message 
    });
  }
};

// Get tenant statistics
export const getTenantStats = async (req, res) => {
  try {
    const totalTenants = await User.countDocuments({ role: 'employee' });
    const activeTenants = await User.countDocuments({ role: 'employee', isActive: true });
    const inactiveTenants = await User.countDocuments({ role: 'employee', isActive: false });
    
    // Get department distribution
    const departmentStats = await User.aggregate([
      { $match: { role: 'employee', isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent tenants
    const recentTenants = await User.find({ role: 'employee' })
      .select('name email department createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        total: totalTenants,
        active: activeTenants,
        inactive: inactiveTenants,
        departments: departmentStats,
        recent: recentTenants
      }
    });
  } catch (error) {
    console.error('❌ Get tenant stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tenant statistics', 
      error: error.message 
    });
  }
};