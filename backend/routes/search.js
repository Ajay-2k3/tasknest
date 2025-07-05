import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { globalSearch, getSearchSuggestions } from '../controllers/searchController.js';

const router = express.Router();

// Global search
router.get('/', authenticateToken, globalSearch);

// Search suggestions
router.get('/suggestions', authenticateToken, getSearchSuggestions);

export default router;