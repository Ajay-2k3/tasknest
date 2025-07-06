import Notification from '../models/Notification.js';

export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      data
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

export const notifyTaskAssigned = async (taskId, assigneeId, taskTitle, assignerName) => {
  return createNotification(
    assigneeId,
    'TASK_ASSIGNED',
    'New Task Assigned',
    `${assignerName} assigned you the task: ${taskTitle}`,
    { taskId, type: 'task' }
  );
};

export const notifyTaskDueSoon = async (taskId, assigneeId, taskTitle, dueDate) => {
  return createNotification(
    assigneeId,
    'TASK_DUE_SOON',
    'Task Due Soon',
    `Task "${taskTitle}" is due on ${new Date(dueDate).toLocaleDateString()}`,
    { taskId, type: 'task', dueDate }
  );
};

export const notifyTaskOverdue = async (taskId, assigneeId, taskTitle) => {
  return createNotification(
    assigneeId,
    'TASK_OVERDUE',
    'Task Overdue',
    `Task "${taskTitle}" is now overdue`,
    { taskId, type: 'task' }
  );
};

export const notifyCommentMention = async (taskId, mentionedUserId, commenterName, taskTitle) => {
  return createNotification(
    mentionedUserId,
    'COMMENT_MENTION',
    'You were mentioned',
    `${commenterName} mentioned you in a comment on "${taskTitle}"`,
    { taskId, type: 'task' }
  );
};

export const notifyEventInvitation = async (eventId, attendeeId, eventTitle, eventDate, inviterName) => {
  return createNotification(
    attendeeId,
    'EVENT_INVITATION',
    'Event Invitation',
    `${inviterName} invited you to "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()}`,
    { eventId, type: 'event', eventDate }
  );
};

export const notifyEventUpdate = async (eventId, attendeeId, eventTitle, eventDate) => {
  return createNotification(
    attendeeId,
    'EVENT_UPDATED',
    'Event Updated',
    `"${eventTitle}" scheduled for ${new Date(eventDate).toLocaleDateString()} has been updated`,
    { eventId, type: 'event', eventDate }
  );
};

export const notifyEventCancellation = async (eventId, attendeeId, eventTitle, eventDate) => {
  return createNotification(
    attendeeId,
    'EVENT_CANCELLED',
    'Event Cancelled',
    `"${eventTitle}" scheduled for ${new Date(eventDate).toLocaleDateString()} has been cancelled`,
    { eventId, type: 'event' }
  );
};