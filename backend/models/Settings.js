import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Diamond Locker Office' },
  companyAddress: { type: String, default: '' },
  companyPhone: { type: String, default: '' },
  cameraDeviceId: { type: String, default: '' },
  backupConfig: {
    autoBackupEnabled: { type: Boolean, default: true },
    backupIntervalHours: { type: Number, default: 24 },
    googleDriveFolderId: { type: String, default: '' },
    googleDriveRefreshToken: { type: String, default: '' },
    lastBackupStatus: { type: String, enum: ['success', 'failed', 'idle'], default: 'idle' },
    lastBackupTime: { type: Date, default: null }
  }
}, {
  timestamps: true
});

export default mongoose.model('Settings', SettingsSchema);
