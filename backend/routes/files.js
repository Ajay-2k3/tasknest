import express from 'express';
import { authenticateToken, requireEmployee } from '../middleware/auth.js';
import { upload, uploadTaskFile, deleteTaskFile, getFile } from '../controllers/fileController.js';

const router = express.Router();

// Upload file to task
router.post('/tasks/:taskId/upload', 
  authenticateToken, 
  requireEmployee, 
  upload.single('file'), 
  uploadTaskFile
);

// Delete file from task
router.delete('/tasks/:taskId/attachments/:attachmentId', 
  authenticateToken, 
  requireEmployee, 
  deleteTaskFile
);

// Get file (with access control)
router.get('/:filename', authenticateToken, getFile);

export default router;