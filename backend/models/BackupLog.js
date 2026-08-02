import mongoose from 'mongoose';

const BackupLogSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  sizeBytes: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  cloudFileId: {
    type: String
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model('BackupLog', BackupLogSchema);
