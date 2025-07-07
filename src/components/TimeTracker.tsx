import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, Save, Plus } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface TimeTrackerProps {
  taskId: string;
  currentActualHours: number;
  estimatedHours: number;
  onTimeUpdate: (newHours: number) => void;
  canTrack: boolean;
}

interface TimeSession {
  startTime: Date | null;
  elapsedTime: number; // in seconds
}

const TimeTracker: React.FC<TimeTrackerProps> = ({
  taskId,
  currentActualHours,
  estimatedHours,
  onTimeUpdate,
  canTrack
}) => {
  const { showSuccess, showError } = useNotification();
  const [session, setSession] = useState<TimeSession>({
    startTime: null,
    elapsedTime: 0
  });
  const [isTracking, setIsTracking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualHours, setManualHours] = useState<string>('');
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Update elapsed time every second when tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && session.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - session.startTime!.getTime()) / 1000);
        setSession(prev => ({ ...prev, elapsedTime: elapsed }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, session.startTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds: number): number => {
    return Math.round((seconds / 3600) * 100) / 100; // Round to 2 decimal places
  };

  const handleStartStop = () => {
    if (!canTrack) {
      showError('Error', 'You can only track time on tasks assigned to you');
      return;
    }

    if (isTracking) {
      // Stop tracking
      setIsTracking(false);
      setSession(prev => ({ ...prev, startTime: null }));
    } else {
      // Start tracking
      setIsTracking(true);
      setSession(prev => ({ 
        ...prev, 
        startTime: new Date(),
        elapsedTime: 0 
      }));
    }
  };

  const handleSaveTime = async () => {
    if (session.elapsedTime === 0) {
      showError('Error', 'No time to save');
      return;
    }

    setIsSaving(true);
    try {
      const additionalHours = formatHours(session.elapsedTime);

      
      // Use the new time tracking endpoint
      const response = await axios.patch(`/tasks/${taskId}/time`, {
        hours: additionalHours
      });

      onTimeUpdate(response.data.task.actualHours);
      setSession({ startTime: null, elapsedTime: 0 });
      showSuccess('Success', `Added ${additionalHours} hours to task`);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to save time');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManualTime = async () => {
    const hours = parseFloat(manualHours);
    
    if (isNaN(hours) || hours <= 0) {
      showError('Error', 'Please enter a valid number of hours');
      return;
    }

    if (hours > 24) {
      showError('Error', 'Cannot add more than 24 hours at once');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.patch(`/tasks/${taskId}/time`, {
        hours: hours
      });

      onTimeUpdate(response.data.task.actualHours);
      setManualHours('');
      setIsAddingManual(false);
      showSuccess('Success', `Added ${hours} hours to task`);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to add time');
    } finally {
      setIsSaving(false);
    }
  };
  const getProgressPercentage = (): number => {
    if (estimatedHours === 0) return 0;
    const percentage = (currentActualHours / estimatedHours) * 100;
    return Math.min(percentage, 100);
  };

  const getProgressColor = (): string => {
    const percentage = (currentActualHours / estimatedHours) * 100;
    if (percentage <= 70) return 'bg-green-500';
    if (percentage <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (): string => {
    const percentage = (currentActualHours / estimatedHours) * 100;
    if (percentage <= 70) return 'text-green-600';
    if (percentage <= 100) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!canTrack) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Time Tracking</h4>
          <div className="text-sm text-gray-500">
            {currentActualHours}h / {estimatedHours}h
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Progress</span>
            <span className={`font-medium ${getProgressTextColor()}`}>
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          Only the assigned team member can track time on this task.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Time Tracking</h4>
        <div className="text-sm text-gray-500">
          {currentActualHours}h / {estimatedHours}h
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Progress</span>
          <span className={`font-medium ${getProgressTextColor()}`}>
            {getProgressPercentage().toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        {currentActualHours > estimatedHours && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Task is over estimated time by {(currentActualHours - estimatedHours).toFixed(2)} hours
          </p>
        )}
      </div>

      {/* Timer Display */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="text-2xl font-mono font-bold text-gray-900">
            {formatTime(session.elapsedTime)}
          </span>
        </div>
        {session.elapsedTime > 0 && (
          <p className="text-xs text-center text-gray-500 mt-1">
            +{formatHours(session.elapsedTime)} hours this session
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex space-x-2">
        <button
          onClick={handleStartStop}
          className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isTracking
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-green-600 bg-green-50 hover:bg-green-100'
          }`}
        >
          {isTracking ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start
            </>
          )}
        </button>
        
        {session.elapsedTime > 0 && (
          <button
            onClick={handleSaveTime}
            disabled={isSaving}
            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </button>
        )}
      </div>
    </div>
      {/* Manual Time Entry */}
      <div className="border-t border-gray-200 pt-3">
        {!isAddingManual ? (
          <button
            onClick={() => setIsAddingManual(true)}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Time Manually
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.1"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="Hours"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAddManualTime}
                disabled={isSaving || !manualHours}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  'Add'
                )}
              </button>
              <button
                onClick={() => {
                  setIsAddingManual(false);
                  setManualHours('');
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Enter hours worked (e.g., 2.5 for 2 hours 30 minutes)
            </p>
          </div>
        )}
      </div>
  );
};

export default TimeTracker;