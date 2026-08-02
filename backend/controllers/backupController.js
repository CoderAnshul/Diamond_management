import path from 'path';
import fs from 'fs';
import BackupLog from '../models/BackupLog.js';
import { createSystemBackup, restoreSystemBackup } from '../services/backupService.js';
import { logActivity } from '../utils/activityLogger.js';

export const getBackupHistory = async (req, res) => {
  try {
    const logs = await BackupLog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const triggerManualBackup = async (req, res) => {
  try {
    const result = await createSystemBackup('manual');
    
    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'MANUAL_BACKUP',
      module: 'Settings',
      remarks: `Manual backup generated: ${result.log.fileName}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, log: result.log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    await restoreSystemBackup(req.params.id);
    
    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'RESTORE_BACKUP',
      module: 'Settings',
      remarks: `System restored to backup ID: ${req.params.id}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'System restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const downloadBackupFile = async (req, res) => {
  try {
    const log = await BackupLog.findById(req.params.id);
    if (!log || log.status !== 'success') {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    const filePath = path.resolve('storage/backups', log.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Physical backup file not found' });
    }
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
