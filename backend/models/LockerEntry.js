import mongoose from 'mongoose';

const LockerEntrySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  lockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Locker',
    required: true,
    index: true
  },
  lockerNumber: {
    type: String,
    required: true
  },
  handledByStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  visitDateTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  capturedPhotoUrl: {
    type: String,
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'bypass_authorized', 'failed'],
    required: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.model('LockerEntry', LockerEntrySchema);
