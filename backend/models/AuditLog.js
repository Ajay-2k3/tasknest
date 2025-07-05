import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE', 'USER_ACTIVATE',
      'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
      'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ACCEPT',
      'COMMENT_ADD', 'FILE_UPLOAD', 'ROLE_CHANGE'
    ]
  },
  resource: {
    type: String, // 'User', 'Project', 'Task', etc.
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);