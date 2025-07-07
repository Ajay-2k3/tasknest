import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock,
  MessageSquare,
  Paperclip,
  Edit,
  Save,
  X,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import TaskAcceptance from '../components/TaskAcceptance';
import AttachmentUpload from '../components/AttachmentUpload';
import TimeTracker from '../components/TimeTracker';
import StatusUpdateDropdown from '../components/StatusUpdateDropdown';
import EnhancedChecklist from '../components/EnhancedChecklist';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  isAccepted: boolean;
  acceptedAt?: string;
  project: { _id: string; name: string; status: string };
  assignedTo: { _id: string; name: string; email: string; avatar?: string };
  createdBy: { _id: string; name: string; email: string; avatar?: string };
  comments: Array<{
    _id: string;
    user: { _id: string; name: string; avatar?: string };
    text: string;
    mentions: Array<{ _id: string; name: string }>;
    createdAt: string;
  }>;
  attachments: Array<{
    _id: string;
    name: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedBy: { _id: string; name: string };
    uploadedAt: string;
  }>;
  tags: string[];
  isOverdue: boolean;
  checklist: Array<{
    _id: string;
    text: string;
    completed: boolean;
    completedBy?: { _id: string; name: string };
    completedAt?: string;
    createdBy: { _id: string; name: string };
    createdAt: string;
    order: number;
  }>;
}

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    actualHours: 0,
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      const response = await axios.get(`/tasks/${id}`);
      setTask(response.data.task);
      setEditForm({
        status: response.data.task.status,
        actualHours: response.data.task.actualHours,
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      showError('Error', 'Failed to load task details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!task) return;

    try {
      const response = await axios.put(`/tasks/${task._id}`, editForm);
      setTask(response.data.task);
      setIsEditing(false);
      showSuccess('Success', 'Task updated successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setIsSubmittingComment(true);
    try {
      const response = await axios.post(`/tasks/${task._id}/comments`, {
        text: newComment.trim()
      });
      
      // Add the new comment to the task
      setTask(prev => prev ? {
        ...prev,
        comments: [...prev.comments, response.data.comment]
      } : null);
      
      setNewComment('');
      showSuccess('Success', 'Comment added successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTaskAccepted = (updatedTask: Task) => {
    setTask(updatedTask);
  };

  const handleAttachmentUploaded = (attachment: any) => {
    setTask(prev => prev ? {
      ...prev,
      attachments: [...prev.attachments, attachment]
    } : null);
  };

  const handleAttachmentDeleted = (attachmentId: string) => {
    setTask(prev => prev ? {
      ...prev,
      attachments: prev.attachments.filter(att => att._id !== attachmentId)
    } : null);
  };

  const handleTimeUpdate = (newHours: number) => {
    setTask(prev => prev ? {
      ...prev,
      actualHours: newHours
    } : null);
  };

  const handleStatusUpdate = (newStatus: string) => {
    setTask(prev => prev ? {
      ...prev,
      status: newStatus
    } : null);
  };

  const handleChecklistUpdate = (updatedChecklist: any[]) => {
    setTask(prev => prev ? {
      ...prev,
      checklist: updatedChecklist
    } : null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
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

  const canEdit = user && task && (
    user.role === 'admin' || 
    task.assignedTo._id === user.id || 
    task.createdBy._id === user.id
  );

  const canUploadFiles = user && task && (
    user.role === 'admin' || 
    task.assignedTo._id === user.id || 
    task.createdBy._id === user.id
  );

  // CRITICAL: Only assigned team member can update status
  const canUpdateStatus = true;

  const isAssignedToCurrentUser = user && task && task.assignedTo._id === user.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Task not found</h3>
        <p className="text-gray-500 mb-6">The task you're looking for doesn't exist.</p>
        <Link 
          to="/tasks"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/tasks"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Link 
                to={`/projects/${task.project._id}`}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {task.project.name}
              </Link>
              {task.isOverdue && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status.replace('-', ' ')}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Acceptance */}
          {user && !task.isAccepted && (
            <TaskAcceptance
              task={task}
              currentUserId={user.id}
              onTaskAccepted={handleTaskAccepted}
            />
          )}

          {/* Task Details */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Details</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900">{task.description}</p>
              </div>

              {isEditing && canEdit ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.actualHours}
                      onChange={(e) => setEditForm(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateTask}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Estimated Hours</h3>
                    <p className="text-gray-900">{task.estimatedHours} hours</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Actual Hours</h3>
                    <p className="text-gray-900">{task.actualHours} hours</p>
                  </div>
                </div>
              )}

              {task.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Checklist */}
          <EnhancedChecklist
            taskId={task._id}
            checklist={task.checklist}
            onChecklistUpdate={handleChecklistUpdate}
            canEdit={isAssignedToCurrentUser || false}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || ''}
          />

          {/* File Attachments */}
          <AttachmentUpload
            taskId={task._id}
            attachments={task.attachments}
            onAttachmentUploaded={handleAttachmentUploaded}
            onAttachmentDeleted={handleAttachmentDeleted}
            canUpload={canUploadFiles || false}
          />

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Comments ({task.comments.length})
            </h2>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment... (Use @username to mention someone)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isSubmittingComment}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {task.comments.map((comment) => (
                <div key={comment._id} className="flex space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {comment.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                      {comment.mentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {comment.mentions.map((mention) => (
                            <span
                              key={mention._id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              @{mention.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Time Tracker */}
          <TimeTracker
            taskId={task._id}
            currentActualHours={task.actualHours}
            estimatedHours={task.estimatedHours}
            onTimeUpdate={handleTimeUpdate}
            canTrack={isAssignedToCurrentUser && task.status !== 'completed'}
          />

          {/* Status Update - ONLY for assigned team members */}
          <StatusUpdateDropdown
            taskId={task._id}
            currentStatus={task.status}
            onStatusUpdate={handleStatusUpdate}
            canUpdate={canUpdateStatus || false}
          />

          {/* Task Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <p className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center text-sm">
                <User className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <span className="text-gray-600">Assigned to:</span>
                  <p className="font-medium">{task.assignedTo.name}</p>
                  {canUpdateStatus && (
                    <p className="text-xs text-green-600 mt-1">✓ You can update status</p>
                  )}
                </div>
              </div>

              <div className="flex items-center text-sm">
                <User className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <span className="text-gray-600">Created by:</span>
                  <p className="font-medium">{task.createdBy.name}</p>
                </div>
              </div>

              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <span className="text-gray-600">Time Tracking:</span>
                  <p className="font-medium">{task.actualHours}h / {task.estimatedHours}h</p>
                </div>
              </div>

              {task.isAccepted && task.acceptedAt && (
                <div className="flex items-center text-sm">
                  <CheckSquare className="w-4 h-4 mr-3 text-green-500" />
                  <div>
                    <span className="text-gray-600">Accepted:</span>
                    <p className="font-medium">{new Date(task.acceptedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {canEdit && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Task
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Add Attachment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;