import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Import User model
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  avatar: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  position: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  assignedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  createdProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

const createDemoUsers = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ajaysettu010101:EYS8msbNnaSyqAjD@cluster0.jz3q4.mongodb.net/tasknest?retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(MONGO_URI);
    console.log('🚀 Connected to MongoDB');

    // Check if demo users already exist
    const existingAdmin = await User.findOne({ email: 'admin@tasknest.com' });
    const existingEmployee = await User.findOne({ email: 'employee@tasknest.com' });

    if (existingAdmin && existingEmployee) {
      console.log('✅ Demo users already exist');
      process.exit(0);
    }

    // Create admin user
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

    // Create employee user
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
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  }
};

createDemoUsers();