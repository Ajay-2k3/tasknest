import Event from '../models/Event.js';
import User from '../models/User.js';
import { createAuditLog } from '../middleware/auditLog.js';
import { createNotification } from '../utils/notificationService.js';

// Get events
export const getEvents = async (req, res) => {
  try {
    const { start, end, type } = req.query;
    const query = {};

    // Filter by date range
    if (start && end) {
      query.$or = [
        {
          startDate: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        },
        {
          endDate: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        }
      ];
    }

    // Filter by type
    if (type) query.type = type;

    // For employees, only show events they're attending or created
    if (req.user.role === 'employee') {
      query.$or = [
        { attendees: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const events = await Event.find(query)
      .populate('attendees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name')
      .populate('task', 'title')
      .sort({ startDate: 1 });

    res.json({ events });
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

// Get single event
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('attendees', 'name email avatar department position')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name status')
      .populate('task', 'title status');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user has access to this event
    if (req.user.role === 'employee') {
      const hasAccess = event.attendees.some(attendee => attendee._id.equals(req.user._id)) ||
                       event.createdBy._id.equals(req.user._id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ event });
  } catch (error) {
    console.error('Fetch event error:', error);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
};

// Create event
export const createEvent = async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate dates
    if (new Date(eventData.endDate) <= new Date(eventData.startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate attendees exist
    if (eventData.attendees && eventData.attendees.length > 0) {
      const validAttendees = await User.find({ 
        _id: { $in: eventData.attendees }, 
        isActive: true 
      });
      if (validAttendees.length !== eventData.attendees.length) {
        return res.status(400).json({ message: 'Some attendees are invalid or inactive' });
      }
    }

    const event = new Event(eventData);
    await event.save();

    await event.populate('attendees', 'name email avatar');
    await event.populate('createdBy', 'name email avatar');

    // Send notifications to attendees
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        if (!attendee._id.equals(req.user._id)) { // Don't notify the creator
          await createNotification(
            attendee._id,
            'EVENT_INVITATION',
            'Event Invitation',
            `You've been invited to "${event.title}" on ${new Date(event.startDate).toLocaleDateString()}`,
            { 
              eventId: event._id, 
              type: 'event',
              startDate: event.startDate,
              endDate: event.endDate
            }
          );
        }
      }
    }

    // Create audit log
    await createAuditLog(req, 'EVENT_CREATE', 'Event', event._id);

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'admin' || event.createdBy.equals(req.user._id);
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const oldAttendees = event.attendees.map(id => id.toString());
    const updates = req.body;

    // Validate dates if being updated
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || event.startDate);
      const endDate = new Date(updates.endDate || event.endDate);
      if (endDate <= startDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    Object.assign(event, updates);
    await event.save();

    await event.populate('attendees', 'name email avatar');
    await event.populate('createdBy', 'name email avatar');

    // Send notifications to new attendees
    if (updates.attendees) {
      const newAttendees = event.attendees.filter(attendee => 
        !oldAttendees.includes(attendee._id.toString()) && 
        !attendee._id.equals(req.user._id)
      );

      for (const attendee of newAttendees) {
        await createNotification(
          attendee._id,
          'EVENT_INVITATION',
          'Event Invitation',
          `You've been invited to "${event.title}" on ${new Date(event.startDate).toLocaleDateString()}`,
          { 
            eventId: event._id, 
            type: 'event',
            startDate: event.startDate,
            endDate: event.endDate
          }
        );
      }

      // Notify existing attendees of updates
      const existingAttendees = event.attendees.filter(attendee => 
        oldAttendees.includes(attendee._id.toString()) && 
        !attendee._id.equals(req.user._id)
      );

      for (const attendee of existingAttendees) {
        await createNotification(
          attendee._id,
          'EVENT_UPDATED',
          'Event Updated',
          `"${event.title}" has been updated. Check the new details.`,
          { 
            eventId: event._id, 
            type: 'event',
            startDate: event.startDate,
            endDate: event.endDate
          }
        );
      }
    }

    // Create audit log
    await createAuditLog(req, 'EVENT_UPDATE', 'Event', event._id);

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions
    const canDelete = req.user.role === 'admin' || event.createdBy.equals(req.user._id);
    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Notify attendees of cancellation
    if (event.attendees && event.attendees.length > 0) {
      for (const attendeeId of event.attendees) {
        if (!attendeeId.equals(req.user._id)) {
          await createNotification(
            attendeeId,
            'EVENT_CANCELLED',
            'Event Cancelled',
            `"${event.title}" scheduled for ${new Date(event.startDate).toLocaleDateString()} has been cancelled.`,
            { 
              eventId: event._id, 
              type: 'event'
            }
          );
        }
      }
    }

    await Event.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(req, 'EVENT_DELETE', 'Event', req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
};