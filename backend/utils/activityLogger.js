import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async ({ userId, username, action, module, customerId = null, lockerId = null, remarks = '', ipAddress = '' }) => {
  try {
    await ActivityLog.create({
      userId,
      username,
      action,
      module,
      customerId,
      lockerId,
      remarks,
      ipAddress
    });
  } catch (error) {
    console.error('Failed to write audit activity log:', error.message);
  }
};
