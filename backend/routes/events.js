import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';

const router = express.Router();

// Get events
router.get('/', authenticateToken, getEvents);

// Get single event
router.get('/:id', authenticateToken, getEvent);

// Create event
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, createEvent);

// Update event
router.put('/:id', authenticateToken, updateEvent);

// Delete event
router.delete('/:id', authenticateToken, deleteEvent);

export default router;