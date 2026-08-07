import Settings from '../models/Settings.js';
import { logActivity } from '../utils/activityLogger.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  const { companyName, companyAddress, companyPhone, cameraDeviceId, backupConfig, lockerSizes } = req.body;
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = new Settings();
    }

    if (companyName) settings.companyName = companyName;
    if (companyAddress !== undefined) settings.companyAddress = companyAddress;
    if (companyPhone !== undefined) settings.companyPhone = companyPhone;
    if (cameraDeviceId !== undefined) settings.cameraDeviceId = cameraDeviceId;
    if (lockerSizes !== undefined) settings.lockerSizes = lockerSizes;

    if (backupConfig) {
      if (backupConfig.autoBackupEnabled !== undefined) {
        settings.backupConfig.autoBackupEnabled = backupConfig.autoBackupEnabled;
      }
      if (backupConfig.backupIntervalHours !== undefined) {
        settings.backupConfig.backupIntervalHours = backupConfig.backupIntervalHours;
      }
      if (backupConfig.googleDriveFolderId !== undefined) {
        settings.backupConfig.googleDriveFolderId = backupConfig.googleDriveFolderId;
      }
      if (backupConfig.googleDriveRefreshToken !== undefined) {
        settings.backupConfig.googleDriveRefreshToken = backupConfig.googleDriveRefreshToken;
      }
    }

    await settings.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_SETTINGS',
      module: 'Settings',
      remarks: 'Updated general settings and backup configurations',
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
