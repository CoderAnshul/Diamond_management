import mongoose from 'mongoose';

const LockerHistorySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  customerName: String,
  action: {
    type: String,
    enum: ['assigned', 'vacated', 'transferred'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  remarks: String
});

const LockerSchema = new mongoose.Schema({
  lockerNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra-large'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available',
    index: true
  },
  assignedCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  assignmentDate: {
    type: Date,
    default: null
  },
  history: [LockerHistorySchema]
}, {
  timestamps: true
});

export default mongoose.model('Locker', LockerSchema);
