import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'staff'],
    required: true
  },
  permissions: {
    canRegisterCustomer: { type: Boolean, default: true },
    canEditCustomer: { type: Boolean, default: true },
    canDeleteCustomer: { type: Boolean, default: false },
    canManageLockers: { type: Boolean, default: false },
    canCreateLockerEntry: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canViewLogs: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compare password helper
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model('User', UserSchema);
