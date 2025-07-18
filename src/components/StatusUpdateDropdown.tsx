import React, { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface StatusUpdateDropdownProps {
  taskId: string;
  currentStatus: string;
  onStatusUpdate: (newStatus: string) => void;
  canUpdate: boolean;
}

const StatusUpdateDropdown: React.FC<StatusUpdateDropdownProps> = ({
  taskId,
  currentStatus,
  onStatusUpdate,
  canUpdate
}) => {
  const { showSuccess, showError } = useNotification();
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' }
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (!canUpdate) {
      showError('Error', 'You can only update status on tasks assigned to you');
      return;
    }

    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      // Use the new dedicated status update endpoint
      await axios.patch(`/tasks/${taskId}/status`, {
        status: newStatus
      });

      onStatusUpdate(newStatus);
      showSuccess('Success', `Task status updated to ${statusOptions.find(s => s.value === newStatus)?.label}`);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStatusOption = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0];
  };

  if (!canUpdate) {
    const currentOption = getCurrentStatusOption();
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
        <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${currentOption.color}`}>
          <CheckCircle className="w-4 h-4 mr-2" />
          {currentOption.label}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Only the assigned team member can update task status.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Update Status</h4>
      
      <div className="relative">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isUpdating}
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {isUpdating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Status Preview */}
      <div className="mt-2">
        <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getCurrentStatusOption().color}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          {getCurrentStatusOption().label}
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateDropdown;