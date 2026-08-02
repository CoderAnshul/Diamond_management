import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Beneficiary from '../models/Beneficiary.js';
import Locker from '../models/Locker.js';
import LockerEntry from '../models/LockerEntry.js';
import ActivityLog from '../models/ActivityLog.js';
import Settings from '../models/Settings.js';
import BackupLog from '../models/BackupLog.js';
import { google } from 'googleapis';

const BACKUP_DIR = 'storage/backups';
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const createSystemBackup = async (triggerType = 'auto') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  try {
    const users = await User.find({});
    const customers = await Customer.find({});
    const beneficiaries = await Beneficiary.find({});
    const lockers = await Locker.find({});
    const lockerEntries = await LockerEntry.find({});
    const activityLogs = await ActivityLog.find({});
    const settings = await Settings.find({});

    const backupPayload = {
      metadata: {
        timestamp: new Date(),
        triggerType,
        version: '1.0.0'
      },
      collections: {
        users,
        customers,
        beneficiaries,
        lockers,
        lockerEntries,
        activityLogs,
        settings
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    const stats = fs.statSync(filePath);
    const sizeBytes = stats.size;

    let cloudFileId = null;
    let uploadRemarks = 'Saved locally.';
    
    const sysSettings = await Settings.findOne({});
    if (sysSettings && sysSettings.backupConfig && sysSettings.backupConfig.googleDriveRefreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GD_CLIENT_ID,
          process.env.GD_CLIENT_SECRET,
          process.env.GD_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          refresh_token: sysSettings.backupConfig.googleDriveRefreshToken
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        const fileMetadata = {
          name: fileName,
          parents: sysSettings.backupConfig.googleDriveFolderId ? [sysSettings.backupConfig.googleDriveFolderId] : []
        };
        const media = {
          mimeType: 'application/json',
          body: fs.createReadStream(filePath)
        };

        const response = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        });

        cloudFileId = response.data.id;
        uploadRemarks = 'Saved locally and uploaded to Google Drive.';
      } catch (err) {
        uploadRemarks = `Saved locally. Cloud upload failed: ${err.message}`;
        console.error('Google Drive Upload Failed:', err.message);
      }
    }

    const log = await BackupLog.create({
      fileName,
      sizeBytes,
      status: 'success',
      cloudFileId,
      remarks: uploadRemarks
    });

    if (sysSettings) {
      sysSettings.backupConfig.lastBackupStatus = 'success';
      sysSettings.backupConfig.lastBackupTime = new Date();
      await sysSettings.save();
    }

    return { success: true, log };
  } catch (error) {
    console.error('Backup generation failed:', error.message);
    
    await BackupLog.create({
      fileName,
      sizeBytes: 0,
      status: 'failed',
      remarks: `Backup failed: ${error.message}`
    });

    const sysSettings = await Settings.findOne({});
    if (sysSettings) {
      sysSettings.backupConfig.lastBackupStatus = 'failed';
      sysSettings.backupConfig.lastBackupTime = new Date();
      await sysSettings.save();
    }

    throw error;
  }
};

export const restoreSystemBackup = async (backupId) => {
  try {
    const log = await BackupLog.findById(backupId);
    if (!log || log.status !== 'success') {
      throw new Error('Backup log not found or backup was unsuccessful');
    }

    const filePath = path.join(BACKUP_DIR, log.fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local backup file ${log.fileName} no longer exists`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data.collections) {
      throw new Error('Invalid backup file format');
    }

    const { users, customers, beneficiaries, lockers, lockerEntries, activityLogs, settings } = data.collections;

    if (users && users.length > 0) {
      await User.deleteMany({});
      await User.insertMany(users);
    }
    if (customers && customers.length > 0) {
      await Customer.deleteMany({});
      await Customer.insertMany(customers);
    }
    if (beneficiaries && beneficiaries.length > 0) {
      await Beneficiary.deleteMany({});
      await Beneficiary.insertMany(beneficiaries);
    }
    if (lockers && lockers.length > 0) {
      await Locker.deleteMany({});
      await Locker.insertMany(lockers);
    }
    if (lockerEntries && lockerEntries.length > 0) {
      await LockerEntry.deleteMany({});
      await LockerEntry.insertMany(lockerEntries);
    }
    if (activityLogs && activityLogs.length > 0) {
      await ActivityLog.deleteMany({});
      await ActivityLog.insertMany(activityLogs);
    }
    if (settings && settings.length > 0) {
      await Settings.deleteMany({});
      await Settings.insertMany(settings);
    }

    return { success: true };
  } catch (error) {
    console.error('Restore failed:', error.message);
    throw error;
  }
};
