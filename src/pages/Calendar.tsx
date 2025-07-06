import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Users,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Modal from '../components/ui/Modal';
import EventDetailModal from '../components/EventDetailModal';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: 'meeting' | 'deadline' | 'reminder' | 'other';
  attendees: Array<{ _id: string; name: string; avatar?: string }>;
  createdBy: { _id: string; name: string; avatar?: string };
  color: string;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: 'meeting' | 'deadline' | 'reminder' | 'other';
  attendees: string[];
  color: string;
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventFormData>({
    defaultValues: {
      allDay: false,
      type: 'other',
      color: '#3B82F6'
    }
  });

  useEffect(() => {
    fetchEvents();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await axios.get('/events', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        }
      });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Error', 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      const response = await axios.post('/events', data);
      showSuccess('Success', 'Event created successfully');
      setEvents(prev => [...prev, response.data.event]);
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to create event');
    }
  };

  const handleEditEvent = (event: Event) => {
    // Set form values for editing
    setValue('title', event.title);
    setValue('description', event.description || '');
    setValue('startDate', new Date(event.startDate).toISOString().slice(0, 16));
    setValue('endDate', new Date(event.endDate).toISOString().slice(0, 16));
    setValue('allDay', event.allDay);
    setValue('type', event.type);
    setValue('color', event.color);
    setValue('attendees', event.attendees.map(a => a._id));
    
    setIsEventDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await axios.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e._id !== eventId));
      showSuccess('Success', 'Event deleted successfully');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setValue('startDate', date.toISOString().slice(0, 16));
    setValue('endDate', new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const handleEventClick = async (event: Event) => {
    try {
      const response = await axios.get(`/events/${event._id}`);
      setSelectedEvent(response.data.event);
      setIsEventDetailOpen(true);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to load event details');
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const typeColors = {
    meeting: 'bg-blue-500',
    deadline: 'bg-red-500',
    reminder: 'bg-yellow-500',
    other: 'bg-gray-500'
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-2 text-gray-600">
            Manage your events and deadlines
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-4 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-4">
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <div key={index} className="h-24"></div>;
              }

              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`h-24 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-blue-50 border-blue-200' : ''
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        className={`text-xs px-2 py-1 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          typeColors[event.type]
                        }`}
                        style={{ backgroundColor: event.color }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setSelectedDate(null);
        }}
        title="Create New Event"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                {...register('title', { required: 'Event title is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                {...register('startDate', { required: 'Start date is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                {...register('endDate', { 
                  required: 'End date is required',
                  validate: (value) => {
                    const startDate = watch('startDate');
                    if (startDate && value <= startDate) {
                      return 'End date must be after start date';
                    }
                    return true;
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="reminder">Reminder</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="color"
                {...register('color')}
                className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('allDay')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  All day event
                </label>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendees
                </label>
                <select
                  multiple
                  {...register('attendees')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                >
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Hold Ctrl/Cmd to select multiple attendees
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setSelectedDate(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Create Event
            </button>
          </div>
        </form>
      </Modal>

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={isEventDetailOpen}
        onClose={() => {
          setIsEventDetailOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        currentUserId={user?.id || ''}
        currentUserRole={user?.role || ''}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default Calendar;