import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Users from './pages/Users';
import TenantManagement from './pages/TenantManagement';
import Calendar from './pages/Calendar';
import NotificationCenter from './pages/NotificationCenter';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/Toaster';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id" element={<ProjectDetail />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="tasks/:id" element={<TaskDetail />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                  <Route path="profile" element={<Profile />} />
                  
                  {/* Admin-only routes */}
                  <Route path="admin/users" element={
                    <ProtectedRoute requireAdmin>
                      <Users />
                    </ProtectedRoute>
                  } />
                  
                  {/* Tenant management route */}
                  <Route path="admin/tenants" element={
                    <ProtectedRoute requireAdmin>
                      <TenantManagement />
                    </ProtectedRoute>
                  } />
                </Route>
                
                {/* Catch all - 404 */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-xl text-gray-600 mb-8">Page not found</p>
                      <Navigate to="/" replace />
                    </div>
                  </div>
                } />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;