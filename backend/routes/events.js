import express from 'express';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/auditLog.js';

const router = express.Router();

// Get events
router.get('/', authenticateToken, async (req, res) => {
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
});

// Create event
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate dates
    if (new Date(eventData.endDate) <= new Date(eventData.startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const event = new Event(eventData);
    await event.save();

    await event.populate('attendees', 'name email avatar');
    await event.populate('createdBy', 'name email avatar');

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
});

// Update event
router.put('/:id', authenticateToken, async (req, res) => {
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

    Object.assign(event, req.body);
    await event.save();

    await event.populate('attendees', 'name email avatar');
    await event.populate('createdBy', 'name email avatar');

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
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
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

    await Event.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(req, 'EVENT_DELETE', 'Event', req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

export default router;