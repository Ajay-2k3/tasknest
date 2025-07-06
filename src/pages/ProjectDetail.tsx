import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  MoreHorizontal,
  Plus,
  CheckSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import AddTaskModal from '../components/AddTaskModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  progress: number;
  manager: { _id: string; name: string; email: string; avatar?: string };
  team: Array<{ _id: string; name: string; email: string; avatar?: string; role: string }>;
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    assignedTo: { name: string; avatar?: string };
  }>;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  tags: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
      if (user?.role === 'admin') {
        fetchUsers();
      }
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      console.log('🔍 Fetching project with ID:', id);
      
      if (!id) {
        showError('Error', 'Project ID is missing');
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`/projects/${id}`);
      console.log('✅ Project fetched successfully:', response.data);
      setProject(response.data.project);
    } catch (error: any) {
      console.error('❌ Error fetching project:', error);
      
      if (error.response?.status === 404) {
        showError('Error', 'Project not found');
      } else if (error.response?.status === 403) {
        showError('Error', 'You do not have permission to view this project');
      } else if (error.response?.status === 400) {
        showError('Error', 'Invalid project ID');
      } else {
        showError('Error', error.response?.data?.message || 'Failed to load project details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.users.filter((u: User) => u._id !== user?.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddTask = async (taskData: TaskFormData) => {
    if (!project) return;

    setIsSubmittingTask(true);
    try {
      const payload = {
        ...taskData,
        project: project._id,
        tags: taskData.tags ? taskData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      const response = await axios.post('/tasks', payload);
      
      // Add the new task to the project's task list
      setProject(prev => prev ? {
        ...prev,
        tasks: [...prev.tasks, {
          _id: response.data.task._id,
          title: response.data.task.title,
          status: response.data.task.status,
          priority: response.data.task.priority,
          dueDate: response.data.task.dueDate,
          assignedTo: response.data.task.assignedTo
        }]
      } : null);

      showSuccess('Success', 'Task created successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to create task');
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
        <p className="text-gray-500 mb-6">The project you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link 
          to="/projects"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const taskStats = {
    total: project.tasks.length,
    completed: project.tasks.filter(t => t.status === 'completed').length,
    inProgress: project.tasks.filter(t => t.status === 'in-progress').length,
    overdue: project.tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/projects"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">{project.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('-', ' ')}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(project.priority)}`}>
            {project.priority}
          </span>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Overview */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="p-3 bg-blue-100 rounded-lg inline-flex mb-2">
                  <CheckSquare className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
                <p className="text-sm text-gray-600">Total Tasks</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-green-100 rounded-lg inline-flex mb-2">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-yellow-100 rounded-lg inline-flex mb-2">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.inProgress}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-red-100 rounded-lg inline-flex mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.overdue}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-600">Start Date:</span>
                <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-600">End Date:</span>
                <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              )}
            </div>

            <div className="space-y-3">
              {project.tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-500 mb-4">Tasks will appear here once they are created.</p>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => setIsAddTaskModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Task
                    </button>
                  )}
                </div>
              ) : (
                project.tasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <Link 
                        to={`/tasks/${task._id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {task.title}
                      </Link>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {task.assignedTo.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTaskStatusColor(task.status)}`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Manager */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Manager</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {project.manager.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{project.manager.name}</p>
                <p className="text-sm text-gray-500">{project.manager.email}</p>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
            {project.team.length === 0 ? (
              <p className="text-gray-500 text-sm">No team members assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {project.team.map((member) => (
                  <div key={member._id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {user?.role === 'admin' && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Team
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Timeline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSubmit={handleAddTask}
        users={users}
        isSubmitting={isSubmittingTask}
      />
    </div>
  );
};

export default ProjectDetail;