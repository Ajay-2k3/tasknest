import React from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  User,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import Modal from './ui/Modal';

interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: 'meeting' | 'deadline' | 'reminder' | 'other';
  attendees: Array<{ _id: string; name: string; email: string; avatar?: string }>;
  createdBy: { _id: string; name: string; email: string; avatar?: string };
  color: string;
}

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  currentUserId: string;
  currentUserRole: string;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete
}) => {
  if (!event) return null;

  const canEdit = currentUserRole === 'admin' || event.createdBy._id === currentUserId;
  const isAttending = event.attendees.some(attendee => attendee._id === currentUserId);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'deadline': return 'bg-red-100 text-red-800';
      case 'reminder': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const startDateTime = formatDateTime(event.startDate);
  const endDateTime = formatDateTime(event.endDate);
  const isSameDay = startDateTime.date === endDateTime.date;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: event.color }}
              ></div>
              <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </span>
          </div>
          
          {canEdit && (
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit event"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this event?')) {
                      onDelete(event._id);
                      onClose();
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900">{event.description}</p>
          </div>
        )}

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Date</p>
              <p className="text-gray-900">
                {isSameDay 
                  ? startDateTime.date 
                  : `${startDateTime.date} - ${endDateTime.date}`
                }
              </p>
            </div>
          </div>

          {!event.allDay && (
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Time</p>
                <p className="text-gray-900">
                  {startDateTime.time} - {endDateTime.time}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Created By */}
        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Created by</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs">
                  {event.createdBy.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-gray-900">{event.createdBy.name}</span>
            </div>
          </div>
        </div>

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <Users className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Attendees ({event.attendees.length})
              </p>
            </div>
            
            <div className="space-y-2">
              {event.attendees.map((attendee) => (
                <div key={attendee._id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {attendee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{attendee.name}</p>
                    <p className="text-xs text-gray-500">{attendee.email}</p>
                  </div>
                  {attendee._id === currentUserId && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Status */}
        {!canEdit && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {isAttending 
                ? '✓ You are invited to this event'
                : 'ℹ️ You are not invited to this event'
              }
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EventDetailModal;