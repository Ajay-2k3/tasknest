import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import clsx from 'clsx';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export const Toaster: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        
        return (
          <div
            key={notification.id}
            className={clsx(
              'max-w-sm w-full bg-white shadow-lg rounded-lg border p-4 transition-all duration-300 transform',
              colorMap[notification.type]
            )}
          >
            <div className="flex items-start">
              <Icon className={clsx('w-5 h-5 mr-3 mt-0.5', iconColorMap[notification.type])} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{notification.title}</p>
                {notification.message && (
                  <p className="text-sm mt-1 opacity-90">{notification.message}</p>
                )}
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-3 inline-flex text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};