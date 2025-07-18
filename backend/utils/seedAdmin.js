import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Seeds a default admin user if none exists
 * This function is called after successful database connection
 */
export const seedDefaultAdmin = async () => {
  try {
    // Check if any admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists, skipping seeding');
      return;
    }

    // Get admin credentials from environment variables
    const adminName = process.env.DEFAULT_ADMIN_NAME || 'Super Admin';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@tasknest.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';

    // Check if user with admin email already exists (but different role)
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log(`⚠️  User with email ${adminEmail} already exists with role: ${existingUser.role}`);
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create the default admin user
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      department: 'Management',
      position: 'System Administrator',
      isActive: true
    });

    await adminUser.save();
    
    console.log('🎉 Default admin user created successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('⚠️  Please change the default password after first login');
    
  } catch (error) {
    console.error('❌ Error seeding default admin user:', error.message);
    // Don't throw error to prevent server startup failure
  }
};

/**
 * Alternative seeding function that creates demo users for development
 */
export const seedDemoUsers = async () => {
  try {
    // Check if demo users already exist
    const existingAdmin = await User.findOne({ email: 'admin@tasknest.com' });
    const existingEmployee = await User.findOne({ email: 'employee@tasknest.com' });

    if (existingAdmin && existingEmployee) {
      console.log('✅ Demo users already exist, skipping seeding');
      return;
    }

    // Create admin user if it doesn't exist
    if (!existingAdmin) {
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@tasknest.com',
        password: 'password123',
        role: 'admin',
        department: 'Management',
        position: 'System Administrator'
      });

      await adminUser.save();
      console.log('✅ Admin demo user created');
    }

    // Create employee user if it doesn't exist
    if (!existingEmployee) {
      const employeeUser = new User({
        name: 'Employee User',
        email: 'employee@tasknest.com',
        password: 'password123',
        role: 'employee',
        department: 'Development',
        position: 'Software Developer'
      });

      await employeeUser.save();
      console.log('✅ Employee demo user created');
    }

    console.log('🎉 Demo users setup complete!');
  } catch (error) {
    console.error('❌ Error creating demo users:', error.message);
  }
};