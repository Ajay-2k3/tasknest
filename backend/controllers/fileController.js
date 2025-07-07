import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Task from '../models/Task.js';
import { createAuditLog } from '../middleware/auditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xlsx|xls|ppt|pptx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Upload file to task
export const uploadTaskFile = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canUpload = req.user.role === 'admin' || 
                     task.assignedTo.equals(req.user._id) || 
                     task.createdBy.equals(req.user._id);
    
    if (!canUpload) {
      // Delete uploaded file if no permission
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to upload files to this task' });
    }

    // Generate full URL for the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const attachment = {
      name: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl, // Use full URL instead of relative path
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    task.attachments.push(attachment);
    
    // Add activity log entry
    task.activityLog.push({
      action: 'file_uploaded',
      user: req.user._id,
      details: { fileName: req.file.originalname, fileSize: req.file.size }
    });

    await task.save();

    // Create audit log
    await createAuditLog(req, 'FILE_UPLOAD', 'Task', task._id, { fileName: req.file.originalname });

    res.status(201).json({
      message: 'File uploaded successfully',
      attachment: attachment
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload file error:', error);
    res.status(500).json({ message: 'Failed to upload file', error: error.message });
  }
};

// Delete file from task
export const deleteTaskFile = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check permissions
    const canDelete = req.user.role === 'admin' || 
                     attachment.uploadedBy.equals(req.user._id);
    
    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads', attachment.name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from task
    task.attachments.pull(attachmentId);
    
    // Add activity log entry
    task.activityLog.push({
      action: 'file_deleted',
      user: req.user._id,
      details: { fileName: attachment.originalName }
    });

    await task.save();

    // Create audit log
    await createAuditLog(req, 'FILE_DELETE', 'Task', task._id, { fileName: attachment.originalName });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file', error: error.message });
  }
};

// Get file (with access control)
export const getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Find task with this attachment
    const task = await Task.findOne({ 'attachments.name': filename });
    if (!task) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     task.assignedTo.equals(req.user._id) || 
                     task.createdBy.equals(req.user._id);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Failed to retrieve file', error: error.message });
  }
};