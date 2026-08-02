import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  lockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Locker',
    default: null
  },
  remarks: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Enforce read-only constraint on saving modifications
ActivityLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Activity logs are immutable and cannot be updated.'));
  }
  next();
});

export default mongoose.model('ActivityLog', ActivityLogSchema);
