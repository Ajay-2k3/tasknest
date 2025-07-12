import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
  Home,
  Building,
  Briefcase,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useFetch, useMutation } from '../hooks/useApi';
import { tenantsAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface Tenant {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  contactNumber?: string;
  roomNumber?: string;
  isActive: boolean;
  assignedTasks: Array<{ _id: string; title: string; status: string }>;
  createdAt: string;
}

interface TenantFormData {
  name: string;
  email: string;
  password: string;
  contactNumber: string;
  roomNumber: string;
  department: string;
  position: string;
}

interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  departments: Array<{ _id: string; count: number }>;
  recent: Array<Tenant>;
}

const TenantManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TenantFormData>();

  // Fetch tenants with filters
  const { 
    data: tenantsResponse, 
    loading: tenantsLoading, 
    refetch: refetchTenants 
  } = useFetch(() => tenantsAPI.getTenants({
    search: searchTerm || undefined,
    department: departmentFilter !== 'all' ? departmentFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined
  }), [searchTerm, departmentFilter, statusFilter]);

  // Fetch tenant statistics
  const { 
    data: statsResponse, 
    loading: statsLoading 
  } = useFetch(() => tenantsAPI.getTenantStats());

  // Create tenant mutation
  const { execute: createTenant, loading: createLoading } = useMutation(
    tenantsAPI.createTenant,
    {
      onSuccess: (data) => {
        showSuccess('Success', 'Tenant created successfully');
        setIsModalOpen(false);
        reset();
        refetchTenants();
      },
      onError: (error) => {
        showError('Error', error);
      }
    }
  );

  // Update tenant mutation
  const { execute: updateTenant, loading: updateLoading } = useMutation(
    (data: { id: string; tenantData: any }) => tenantsAPI.updateTenant(data.id, data.tenantData),
    {
      onSuccess: () => {
        showSuccess('Success', 'Tenant updated successfully');
        setIsEditMode(false);
        setSelectedTenant(null);
        refetchTenants();
      },
      onError: (error) => {
        showError('Error', error);
      }
    }
  );

  // Toggle tenant status mutation
  const { execute: toggleTenantStatus } = useMutation(
    (data: { id: string; activate: boolean }) => 
      data.activate ? tenantsAPI.activateTenant(data.id) : tenantsAPI.deleteTenant(data.id),
    {
      onSuccess: (_, variables) => {
        showSuccess('Success', `Tenant ${variables.activate ? 'activated' : 'deactivated'} successfully`);
        refetchTenants();
      },
      onError: (error) => {
        showError('Error', error);
      }
    }
  );

  const tenants = tenantsResponse?.tenants || [];
  const stats = statsResponse?.stats as TenantStats;

  const onSubmit = async (data: TenantFormData) => {
    if (isEditMode && selectedTenant) {
      await updateTenant({ id: selectedTenant.id, tenantData: data });
    } else {
      await createTenant(data);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditMode(true);
    reset({
      name: tenant.name,
      email: tenant.email,
      contactNumber: tenant.contactNumber || '',
      roomNumber: tenant.roomNumber || '',
      department: tenant.department,
      position: tenant.position,
      password: '' // Don't populate password for edit
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = (tenant: Tenant) => {
    if (window.confirm(`Are you sure you want to ${tenant.isActive ? 'deactivate' : 'activate'} ${tenant.name}?`)) {
      toggleTenantStatus({ id: tenant.id, activate: !tenant.isActive });
    }
  };

  const getTaskStats = (tasks: Tenant['assignedTasks']) => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'in-progress').length;
    
    return { total, completed, inProgress };
  };

  // Get unique departments for filter
  const departments = stats?.departments || [];

  if (tenantsLoading && !tenants.length) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your tenants and their access
          </p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setSelectedTenant(null);
            reset();
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Tenants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-3xl font-bold text-gray-900">{departments.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept._id}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Tenants Grid */}
      {tenants.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by adding your first tenant.'
            }
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => {
            const taskStats = getTaskStats(tenant.assignedTasks);
            
            return (
              <div key={tenant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {tenant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            tenant.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tenant.role === 'admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {tenant.role}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            tenant.isActive ? 'bg-green-500' : 'bg-red-500'
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
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    
                    {tenant.department && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className="w-4 h-4 mr-2" />
                        <span>{tenant.department}</span>
                      </div>
                    )}
                    
                    {tenant.position && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 mr-2" />
                        <span>{tenant.position}</span>
                      </div>
                    )}

                    {tenant.contactNumber && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{tenant.contactNumber}</span>
                      </div>
                    )}

                    {tenant.roomNumber && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Home className="w-4 h-4 mr-2" />
                        <span>Room {tenant.roomNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Statistics */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
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
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(tenant)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tenant)}
                      className={`flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        tenant.isActive
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {tenant.isActive ? (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Tenant Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEditMode(false);
          setSelectedTenant(null);
          reset();
          setShowPassword(false);
        }}
        title={isEditMode ? 'Edit Tenant' : 'Add New Tenant'}
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

            {!isEditMode && (
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
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  {...register('contactNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number
                </label>
                <input
                  type="text"
                  {...register('roomNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Room number"
                />
              </div>
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
                setIsEditMode(false);
                setSelectedTenant(null);
                reset();
                setShowPassword(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading || updateLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {(createLoading || updateLoading) ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Tenant' : 'Create Tenant'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenantManagement;