import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: ['aadhaar', 'agreement', 'other', 'vacate'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  altMobile: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  aadhaarNumber: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  depositAmount: {
    type: Number,
    required: true
  },
  agreementDate: {
    type: Date,
    required: true
  },
  lockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Locker',
    default: null,
    index: true
  },
  remarks: {
    type: String,
    trim: true
  },
  codeWord: {
    type: String,
    trim: true,
    default: ''
  },
  photoUrl: {
    type: String,
    required: true
  },
  documents: [DocumentSchema],
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Customer', CustomerSchema);
