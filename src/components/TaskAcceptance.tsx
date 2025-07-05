import React, { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface TaskAcceptanceProps {
  task: {
    _id: string;
    title: string;
    isAccepted: boolean;
    acceptedAt?: string;
    assignedTo: { _id: string; name: string };
    dueDate: string;
    priority: string;
  };
  currentUserId: string;
  onTaskAccepted: (task: any) => void;
}

const TaskAcceptance: React.FC<TaskAcceptanceProps> = ({
  task,
  currentUserId,
  onTaskAccepted
}) => {
  const { showSuccess, showError } = useNotification();
  const [isAccepting, setIsAccepting] = useState(false);

  const isAssignedToCurrentUser = task.assignedTo._id === currentUserId;
  const isOverdue = new Date(task.dueDate) < new Date();

  const handleAcceptTask = async () => {
    setIsAccepting(true);
    try {
      const response = await axios.patch(`/tasks/${task._id}/accept`);
      showSuccess('Success', 'Task accepted successfully');
      onTaskAccepted(response.data.task);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to accept task');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isAssignedToCurrentUser) {
    return null;
  }

  if (task.isAccepted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Check className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-green-800">Task Accepted</p>
            <p className="text-xs text-green-600">
              Accepted on {new Date(task.acceptedAt!).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {isOverdue ? (
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
          )}
          <div>
            <p className={`text-sm font-medium ${
              isOverdue ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {isOverdue ? 'Overdue Task - Action Required' : 'Task Awaiting Acceptance'}
            </p>
            <p className={`text-xs ${
              isOverdue ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {isOverdue 
                ? `This task was due on ${new Date(task.dueDate).toLocaleDateString()}`
                : `Due: ${new Date(task.dueDate).toLocaleDateString()}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAcceptTask}
            disabled={isAccepting}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isOverdue
                ? 'text-white bg-red-600 hover:bg-red-700 disabled:opacity-50'
                : 'text-white bg-green-600 hover:bg-green-700 disabled:opacity-50'
            }`}
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                Accepting...
              </>
            ) : (
              <>
                <Check className="w-3 h-3 mr-1" />
                {isOverdue ? 'Accept & Start' : 'Accept Task'}
              </>
            )}
          </button>
        </div>
      </div>

      {isOverdue && (
        <div className="mt-3 p-2 bg-red-100 rounded border border-red-200">
          <p className="text-xs text-red-700">
            <strong>Note:</strong> This task is overdue. Please accept and update the status immediately 
            or contact your project manager if you need assistance.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskAcceptance;