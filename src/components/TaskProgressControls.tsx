import React, { useState } from 'react';
import { Play, Clock, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface TaskProgressControlsProps {
  task: {
    _id: string;
    status: string;
    actualHours: number;
    assignedTo: { _id: string; name: string };
  };
  onTaskUpdated: (updatedTask: any) => void;
}

const TaskProgressControls: React.FC<TaskProgressControlsProps> = ({
  task,
  onTaskUpdated
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [hoursToAdd, setHoursToAdd] = useState<string>('');
  const [showTimeInput, setShowTimeInput] = useState(false);

  // Only show controls if user is the assigned team member
  if (!user || task.assignedTo._id !== user.id) {
    return null;
  }

  const handleStartTask = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await axios.patch(`/tasks/${task._id}/status`, {
        status: 'in-progress'
      });
      onTaskUpdated(response.data.task);
      showSuccess('Success', 'Task started');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to start task');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const response = await axios.patch(`/tasks/${task._id}/status`, {
        status: newStatus
      });
      onTaskUpdated(response.data.task);
      showSuccess('Success', 'Task status updated');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogTime = async () => {
    const hours = parseFloat(hoursToAdd);
    if (isNaN(hours) || hours <= 0) {
      showError('Error', 'Please enter a valid number of hours');
      return;
    }

    setIsLoggingTime(true);
    try {
      const response = await axios.patch(`/tasks/${task._id}/time`, {
        hoursToAdd: hours
      });
      onTaskUpdated(response.data.task);
      showSuccess('Success', `${hours} hours logged`);
      setHoursToAdd('');
      setShowTimeInput(false);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to log time');
    } finally {
      setIsLoggingTime(false);
    }
  };

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' }
  ];

  const currentStatusOption = statusOptions.find(option => option.value === task.status);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Progress</h3>
      
      <div className="space-y-4">
        {/* Start Task Button - Only show when status is "todo" */}
        {task.status === 'todo' && (
          <button
            onClick={handleStartTask}
            disabled={isUpdatingStatus}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUpdatingStatus ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Task
              </>
            )}
          </button>
        )}

        {/* Status Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Update Status
          </label>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdatingStatus}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Current Status Display */}
          <div className="mt-2">
            <span className="text-xs text-gray-500">Current status: </span>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${currentStatusOption?.color}`}>
              {currentStatusOption?.label}
            </span>
          </div>
        </div>

        {/* Time Logging */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Log Time Worked
            </label>
            <span className="text-xs text-gray-500">
              Total: {task.actualHours}h
            </span>
          </div>
          
          {!showTimeInput ? (
            <button
              onClick={() => setShowTimeInput(true)}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Clock className="w-4 h-4 mr-2" />
              Add Hours
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={hoursToAdd}
                  onChange={(e) => setHoursToAdd(e.target.value)}
                  placeholder="Hours worked"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleLogTime}
                  disabled={isLoggingTime || !hoursToAdd}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isLoggingTime ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowTimeInput(false);
                  setHoursToAdd('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Task Progress</span>
            <span className="font-medium">
              {task.status === 'completed' ? '100%' : 
               task.status === 'in-progress' ? '50%' : 
               task.status === 'blocked' ? '25%' : '0%'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                task.status === 'completed' ? 'bg-green-500 w-full' :
                task.status === 'in-progress' ? 'bg-blue-500 w-1/2' :
                task.status === 'blocked' ? 'bg-red-500 w-1/4' :
                'bg-gray-400 w-0'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskProgressControls;