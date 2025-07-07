import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Building,
  Briefcase,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  isActive: boolean;
  assignedTasks: Array<{ _id: string; title: string; status: string }>;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  department: string;
  position: string;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>();

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, departmentFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);

      const response = await axios.get(`/users?${params.toString()}`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error', 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Use the admin-only route with proper authentication
      await axios.post('/admin/create-user', data);
      showSuccess('Success', 'User created successfully');
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.patch(`/users/${userId}/${endpoint}`);
      showSuccess('Success', `User ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update user status');
    }
  };

  const getTaskStats = (tasks: User['assignedTasks']) => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'in-progress').length;
    
    return { total, completed, inProgress };
  };

  // Get unique departments for filter
  const departments = [...new Set(users.map(user => user.department).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-2 text-gray-600">
            Manage your team members and their access
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || roleFilter !== 'all' || departmentFilter !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first team member.'
            }
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => {
            const taskStats = getTaskStats(user.assignedTasks);
            
            return (
              <div key={user._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {user.role}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            user.isActive ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    
                    {user.department && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="w-4 h-4 mr-2" />
                        <span>{user.department}</span>
                      </div>
                    )}
                    
                    {user.position && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 mr-2" />
                        <span>{user.position}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Statistics */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Task Overview</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{taskStats.total}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{taskStats.inProgress}</p>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{taskStats.completed}</p>
                        <p className="text-xs text-gray-500">Done</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        user.isActive
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setShowPassword(false);
        }}
        title="Create New User"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                {...register('name', { 
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                    message: 'Please enter a valid email'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a role</option>
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                {...register('department')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Engineering, Marketing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <input
                type="text"
                {...register('position')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Senior Developer, Project Manager"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setShowPassword(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;