import AuditLog from '../models/AuditLog.js';

export const createAuditLog = async (req, action, resource, resourceId, details = {}) => {
  try {
    if (!req.user) return;

    await AuditLog.create({
      user: req.user._id,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

export const auditMiddleware = (action, resource) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || 
                          (typeof data === 'object' && data.id) || 
                          (typeof data === 'object' && data._id) ||
                          'unknown';
        
        createAuditLog(req, action, resource, resourceId, {
          method: req.method,
          url: req.originalUrl,
          body: req.method !== 'GET' ? req.body : undefined
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};