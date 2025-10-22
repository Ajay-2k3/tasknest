import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import { apiLimiter, dashboardLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import eventRoutes from './routes/events.js';
import fileRoutes from './routes/files.js';
import searchRoutes from './routes/search.js';

// Import seeding utilities
import { seedDefaultAdmin, seedDemoUsers } from './utils/seedAdmin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Robust CORS configuration with flexible whitelist
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
];

// Allow comma-separated list via CORS_ORIGINS
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins.filter(Boolean), ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser or same-origin requests with no origin header
    if (!origin) return callback(null, true);

    // Explicit allow if exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Pattern allow for common hostings (Preview/Prod URLs)
    try {
      const hostname = new URL(origin).hostname;
      const patternAllowed = (
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.netlify.app') ||
        hostname.endsWith('.onrender.com') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      );
      if (patternAllowed) return callback(null, true);
    } catch (_) {}

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

// Preflight and CORS
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply rate limiting strategically
app.use('/api/auth', apiLimiter);
app.use('/api/analytics', dashboardLimiter);
app.use('/api/notifications', dashboardLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'TaskNest API is running!', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validation error', 
      errors 
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      message: `${field} already exists` 
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
  }

  if (err.message === 'Only images and documents are allowed') {
    return res.status(400).json({ message: err.message });
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    return res.status(503).json({ message: 'Database connection error' });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// MongoDB connection with enhanced fallback and seeding
const connectDB = async () => {
  try {
    // Enhanced MongoDB URI with local fallback
    const MONGO_URI = process.env.MONGO_URI || 
                     process.env.MONGODB_URI || 
                     'mongodb://127.0.0.1:27017/tasknest';
    
    console.log('🔗 Attempting to connect to MongoDB...');
    
    // Log connection type (but not full URI for security)
    if (MONGO_URI.includes('mongodb+srv://')) {
      console.log('📡 Using MongoDB Atlas (Cloud)');
    } else if (MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost')) {
      console.log('💻 Using Local MongoDB');
    } else {
      console.log('🔗 Using Custom MongoDB URI');
    }

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('🚀 MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    // Seed default admin user after successful connection
    await seedDefaultAdmin();
    
    // Also create demo users for development (existing functionality)
    await seedDemoUsers();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Enhanced error handling with fallback suggestions
    if (error.message.includes('ECONNREFUSED') && !process.env.MONGO_URI) {
      console.log('💡 Tip: Make sure MongoDB is running locally, or set MONGO_URI in .env for cloud connection');
    }
    
    console.error('Full error:', error);
    process.exit(1);
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🌟 TaskNest server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;