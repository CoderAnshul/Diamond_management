import LockerEntry from '../models/LockerEntry.js';
import Customer from '../models/Customer.js';
import Locker from '../models/Locker.js';
import User from '../models/User.js';
import Beneficiary from '../models/Beneficiary.js';
import { logActivity } from '../utils/activityLogger.js';
import fs from 'fs';

// Search customer for locker entry (visit check)
export const searchCustomerForVisit = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      return res.status(200).json({ success: true, results: [] });
    }

    // Search lockers if it matches a locker number
    const lockers = await Locker.find({ lockerNumber: { $regex: query, $options: 'i' } });
    const lockerIds = lockers.map(l => l._id);

    // Search customers
    const customers = await Customer.find({
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } },
        { aadhaarNumber: { $regex: query, $options: 'i' } },
        { lockerId: { $in: lockerIds } }
      ]
    }).populate('lockerId', 'lockerNumber size status');

    const results = [];
    for (let customer of customers) {
      const beneficiaries = await Beneficiary.find({ customerId: customer._id, isDeleted: false });
      results.push({
        customer,
        beneficiaries
      });
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a visit entry log
export const createVisitEntry = async (req, res) => {
  const { customerId, handledByStaffId, verificationStatus, remarks, photoData } = req.body;
  try {
    if (!customerId || !handledByStaffId || !verificationStatus) {
      return res.status(400).json({ success: false, error: 'Please fill all required fields' });
    }

    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    if (!customer.lockerId) {
      return res.status(400).json({ success: false, error: 'Customer does not have an active locker assigned' });
    }

    const locker = await Locker.findById(customer.lockerId);
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Assigned locker not found' });
    }

    const staffUser = await User.findById(handledByStaffId);
    if (!staffUser) {
      return res.status(404).json({ success: false, error: 'Responsible staff member not found' });
    }

    let capturedPhotoUrl = '';
    if (req.files && req.files.capturedPhoto) {
      capturedPhotoUrl = `/uploads/photos/${req.files.capturedPhoto[0].filename}`;
    } else if (photoData) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      const filename = `visit-${customerId}-${Date.now()}.jpg`;
      const filepath = `storage/uploads/photos/${filename}`;
      fs.writeFileSync(filepath, base64Data, { encoding: 'base64' });
      capturedPhotoUrl = `/uploads/photos/${filename}`;
    } else {
      return res.status(400).json({ success: false, error: 'Verification captured photo is required' });
    }

    const entry = await LockerEntry.create({
      customerId: customer._id,
      customerName: customer.name,
      lockerId: locker._id,
      lockerNumber: locker.lockerNumber,
      handledByStaffId: staffUser._id,
      staffName: staffUser.username,
      capturedPhotoUrl,
      verificationStatus,
      remarks
    });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'CUSTOMER_VISIT',
      module: 'VisitEntry',
      customerId: customer._id,
      lockerId: locker._id,
      remarks: `Customer ${customer.name} visited locker ${locker.lockerNumber}. Handled by ${staffUser.username}. Verification: ${verificationStatus}. Remarks: ${remarks || ''}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get visits history (paginated & filtered)
export const getVisitEntries = async (req, res) => {
  const { customerId, lockerNumber, staffId, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
  try {
    const query = {};

    if (customerId) query.customerId = customerId;
    if (staffId) query.handledByStaffId = staffId;
    
    if (lockerNumber) {
      query.lockerNumber = { $regex: lockerNumber, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      query.visitDateTime = {};
      if (dateFrom) query.visitDateTime.$gte = new Date(dateFrom);
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query.visitDateTime.$lte = endOfDay;
      }
    }

    const count = await LockerEntry.countDocuments(query);
    const entries = await LockerEntry.find(query)
      .sort({ visitDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      entries
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
