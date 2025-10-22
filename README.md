# TaskNest: Full-Stack Project Management System

TaskNest is a comprehensive MERN stack application designed for agile project management, task tracking, team collaboration, and productivity monitoring. Built with modern technologies and best practices for scalable team workflows.

![TaskNest Dashboard](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=TaskNest+Dashboard)

## 🌟 Features

### 👥 **User Management**
- **Role-based Access Control** - Admin and Employee roles with different permissions
- **User Authentication** - Secure JWT-based login/logout system
- **Profile Management** - Update personal information and change passwords
- **Team Directory** - View and manage team members (Admin only)

### 📋 **Project & Task Management**
- **Project Creation** - Create and manage projects with teams and deadlines
- **Task Assignment** - Assign tasks to team members with priorities and due dates
- **Status Tracking** - Real-time task status updates (To Do, In Progress, Review, Completed)
- **Task Acceptance** - Team members can accept assigned tasks
- **Smart Checklists** - Break down tasks into manageable sub-items

### ⏱️ **Time Tracking**
- **Built-in Timer** - Start/stop time tracking for tasks
- **Time Logging** - Manual time entry and session tracking
- **Progress Monitoring** - Compare estimated vs actual hours
- **Efficiency Metrics** - Track productivity and time management

### 💬 **Collaboration**
- **Comments System** - Add comments to tasks with @mentions
- **File Attachments** - Upload and preview images, documents, and files
- **Real-time Notifications** - Stay updated on task changes and mentions
- **Activity Logs** - Track all task and project activities

### 📊 **Analytics & Reporting**
- **Dashboard Overview** - Visual summary of projects and tasks
- **Performance Analytics** - Team productivity and completion rates
- **Progress Charts** - Visual representation of project progress
- **Calendar Integration** - Schedule events and track deadlines

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Axios** - HTTP client for API requests
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

## 📋 Prerequisites

Before setting up TaskNest, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** - VS Code recommended

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/tasknest.git
cd tasknest
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Configure Environment Variables

Edit the `.env` file in the backend directory:

```env
# MongoDB Configuration
MONGO_URI=mongodb://127.0.0.1:27017/tasknest
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/tasknest

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:5173

# Default Admin User (will be created automatically)
DEFAULT_ADMIN_NAME=Super Admin
DEFAULT_ADMIN_EMAIL=admin@tasknest.com
DEFAULT_ADMIN_PASSWORD=Admin123!
```

### 4. Start MongoDB

#### Option A: Local MongoDB
```bash
# Start MongoDB service (varies by OS)
# Windows: Start MongoDB service from Services
# macOS: brew services start mongodb/brew/mongodb-community
# Linux: sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get connection string and update `MONGO_URI` in `.env`

### 5. Start Backend Server

```bash
# From backend directory
npm run dev

# You should see:
# 🚀 MongoDB connected successfully
# 🌟 TaskNest server running on port 5000
# 🎉 Default admin user created successfully
```

### 6. Frontend Setup

Open a new terminal window:

```bash
# Navigate to project root (not backend)
cd ..

# Install frontend dependencies
npm install

# Start development server
npm run dev

# You should see:
# Local:   http://localhost:5173/
```

### 7. Access the Application

1. **Open your browser** and go to `http://localhost:5173`
2. **Login with default admin credentials:**
   - Email: `admin@tasknest.com`
   - Password: `Admin123!`

## 🎯 How to Use TaskNest

### Getting Started

1. **Login** with the default admin account
2. **Change the default password** in Profile settings
3. **Create team members** in the Users section
4. **Create your first project** with team assignments
5. **Add tasks** to the project and assign to team members

### For Administrators

#### Creating Projects
1. Go to **Projects** → **New Project**
2. Fill in project details (name, description, dates, team)
3. Set priority and budget if needed
4. **Save** to create the project

#### Managing Tasks
1. Navigate to a **Project** → **Add Task**
2. Set task details (title, description, assignee, due date)
3. Set priority and estimated hours
4. **Create Task** to assign to team member

#### Team Management
1. Go to **Team** → **Create User**
2. Enter user details and set role (Admin/Employee)
3. User receives account credentials
4. Monitor team performance in Analytics

### For Team Members

#### Accepting Tasks
1. **Login** to your account
2. View **assigned tasks** on Dashboard
3. **Accept tasks** to start working
4. Update **task status** as you progress

#### Time Tracking
1. Open a **task detail** page
2. Use the **time tracker** to log work sessions
3. **Save time** when finished working
4. View time vs estimates

#### Collaboration
1. **Add comments** to tasks for updates
2. **Upload files** and attachments
3. **Use @mentions** to notify team members
4. **Update checklists** to track sub-tasks

## 📁 Project Structure

```
tasknest/
├── backend/                 # Express.js backend
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── uploads/            # File uploads storage
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts
│   ├── pages/              # Page components
│   └── main.tsx           # App entry point
├── public/                 # Static assets
└── package.json           # Frontend dependencies
```

## 🔧 Development Commands

### Backend Commands
```bash
cd backend
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run setup-demo  # Create demo users
```

### Frontend Commands
```bash
npm run dev         # Start Vite development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Full Stack Commands
```bash
npm run dev         # Start both frontend and backend
npm run build       # Build both frontend and backend
```

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
# Check if MongoDB is running
# For local MongoDB:
mongosh  # Should connect successfully

# For MongoDB Atlas:
# Verify connection string and network access
```

#### Port Already in Use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 5173 (frontend)
npx kill-port 5173
```

#### File Upload Issues
```bash
# Ensure uploads directory exists
mkdir backend/uploads

# Check file permissions
chmod 755 backend/uploads
```

#### Authentication Issues
```bash
# Clear browser localStorage
# In browser console:
localStorage.clear()

# Restart both servers
```

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Password hashing** with bcrypt
- **Role-based access control**
- **Input validation** and sanitization
- **Rate limiting** on API endpoints
- **File upload restrictions** and validation
- **CORS protection**
- **Helmet.js** security headers

## 📈 Performance Optimizations

- **Database indexing** for faster queries
- **Image optimization** and compression
- **Lazy loading** for components
- **API response caching**
- **Bundle splitting** with Vite
- **Optimized MongoDB queries**

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables for API URL

#### Fix 404 on refresh (Vercel SPA routing)
If you see a 404 page when refreshing a client route like `/login` on Vercel, make sure the project includes a SPA fallback. This repo ships with `vercel.json` that:

```
{
   "routes": [
      { "handle": "filesystem" },
      { "src": "/.*", "dest": "/index.html" }
   ]
}
```

This tells Vercel to serve `index.html` for any non-file route so React Router can handle it. After adding/updating this file, trigger a redeploy.

### Backend (Railway/Heroku)
1. Set environment variables
2. Ensure MongoDB connection
3. Deploy with: `npm start`

### Environment Variables for Production
```env
NODE_ENV=production
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=your-frontend-domain
# Optionally allow multiple origins (comma-separated)
CORS_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app
```

### CORS in Production
The backend now ships with a flexible CORS whitelist that:
- Reads `CLIENT_URL` and `CORS_ORIGINS` (comma-separated)
- Also allows common preview domains like `*.vercel.app`, `*.netlify.app`, `*.onrender.com`

To fix login calls blocked by CORS after deploying the frontend on Vercel:
1. Set `CLIENT_URL` in the backend environment to your exact frontend URL, e.g. `https://tasknest-delta.vercel.app`
2. Optionally set `CORS_ORIGINS` with any additional domains (preview URLs etc.)
3. In the frontend, set `VITE_API_URL` to your backend API base, including `/api` (example: `https://your-backend.example.com/api`).
4. Redeploy both backend and frontend.


## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. **Check** the troubleshooting section above
2. **Search** existing issues on GitHub
3. **Create** a new issue with detailed information
4. **Join** our community discussions

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **MongoDB** for the flexible database
- **Tailwind CSS** for the utility-first styling
- **Lucide** for the beautiful icons
- **Open Source Community** for inspiration and tools

---

**Built with ❤️ by the TaskNest Team**

*Happy Project Managing! 🚀*