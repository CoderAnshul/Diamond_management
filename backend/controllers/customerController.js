import Customer from '../models/Customer.js';
import Locker from '../models/Locker.js';
import Beneficiary from '../models/Beneficiary.js';
import LockerEntry from '../models/LockerEntry.js';
import { logActivity } from '../utils/activityLogger.js';
import fs from 'fs';

// Get paginated customers with search filters
export const getCustomers = async (req, res) => {
  const { search, lockerNumber, page = 1, limit = 10 } = req.query;
  try {
    const query = { isDeleted: false };

    // Search filter (Name, Mobile, Aadhaar)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { aadhaarNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Locker filter
    if (lockerNumber) {
      const locker = await Locker.findOne({ lockerNumber: { $regex: lockerNumber, $options: 'i' } });
      if (locker) {
        query.lockerId = locker._id;
      } else {
        // Force no results if locker search doesn't match anything
        query.lockerId = '000000000000000000000000';
      }
    }

    const count = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate('lockerId', 'lockerNumber size status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      customers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get details of a single customer, including history and beneficiaries
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false })
      .populate('lockerId', 'lockerNumber size status');

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Find active beneficiaries
    const beneficiaries = await Beneficiary.find({ customerId: customer._id, isDeleted: false });

    // Find past visits / entries
    const visits = await LockerEntry.find({ customerId: customer._id })
      .sort({ visitDateTime: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      customer,
      beneficiaries,
      visits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Register customer
export const registerCustomer = async (req, res) => {
  try {
    const { name, mobile, altMobile, address, aadhaarNumber, depositAmount, agreementDate, lockerId, remarks } = req.body;
    
    // Check duplicates
    const existing = await Customer.findOne({ $or: [{ mobile }, { aadhaarNumber }], isDeleted: false });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Customer with this Mobile or Aadhaar number already exists' });
    }

    // Master Photo upload check
    let photoUrl = '';
    if (req.files && req.files.photo) {
      photoUrl = `/uploads/photos/${req.files.photo[0].filename}`;
    } else if (req.body.photoData) {
      // Base64 camera photo fallback
      const base64Data = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
      const filename = `photo-live-${Date.now()}.jpg`;
      const filepath = `storage/uploads/photos/${filename}`;
      fs.writeFileSync(filepath, base64Data, { encoding: 'base64' });
      photoUrl = `/uploads/photos/${filename}`;
    } else {
      return res.status(400).json({ success: false, error: 'Master customer photo is required' });
    }

    const documents = [];
    if (req.files) {
      if (req.files.aadhaarDoc) {
        documents.push({
          docType: 'aadhaar',
          fileUrl: `/uploads/docs/${req.files.aadhaarDoc[0].filename}`
        });
      }
      if (req.files.agreementDoc) {
        documents.push({
          docType: 'agreement',
          fileUrl: `/uploads/docs/${req.files.agreementDoc[0].filename}`
        });
      }
      if (req.files.otherDoc) {
        documents.push({
          docType: 'other',
          fileUrl: `/uploads/docs/${req.files.otherDoc[0].filename}`
        });
      }
    }

    const parsedDeposit = parseFloat(depositAmount) || 0;

    const customer = await Customer.create({
      name,
      mobile,
      altMobile,
      address,
      aadhaarNumber,
      depositAmount: parsedDeposit,
      agreementDate: agreementDate ? new Date(agreementDate) : new Date(),
      remarks,
      photoUrl,
      documents,
      lockerId: lockerId || null
    });

    // Handle locker assignment
    if (lockerId) {
      const locker = await Locker.findById(lockerId);
      if (locker) {
        if (locker.status === 'occupied') {
          await Customer.findByIdAndDelete(customer._id);
          return res.status(400).json({ success: false, error: 'Selected locker is already occupied' });
        }
        locker.status = 'occupied';
        locker.assignedCustomerId = customer._id;
        locker.assignmentDate = new Date();
        locker.history.push({
          customerId: customer._id,
          customerName: customer.name,
          action: 'assigned',
          remarks: 'Assigned during customer registration'
        });
        await locker.save();
      }
    }

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'CREATE_CUSTOMER',
      module: 'Customer',
      customerId: customer._id,
      lockerId: lockerId || null,
      remarks: `Registered customer: ${customer.name}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Customer Details
export const updateCustomer = async (req, res) => {
  try {
    const { name, mobile, altMobile, address, aadhaarNumber, depositAmount, agreementDate, remarks } = req.body;
    
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Check duplicate Aadhaar/Mobile
    if (mobile || aadhaarNumber) {
      const duplicateQuery = {
        _id: { $ne: customer._id },
        isDeleted: false,
        $or: []
      };
      if (mobile) duplicateQuery.$or.push({ mobile });
      if (aadhaarNumber) duplicateQuery.$or.push({ aadhaarNumber });
      
      if (duplicateQuery.$or.length > 0) {
        const duplicate = await Customer.findOne(duplicateQuery);
        if (duplicate) {
          return res.status(400).json({ success: false, error: 'Mobile or Aadhaar number is already in use by another customer' });
        }
      }
    }

    if (name) customer.name = name;
    if (mobile) customer.mobile = mobile;
    if (altMobile !== undefined) customer.altMobile = altMobile;
    if (address) customer.address = address;
    if (aadhaarNumber) customer.aadhaarNumber = aadhaarNumber;
    if (depositAmount !== undefined) customer.depositAmount = parseFloat(depositAmount) || 0;
    if (agreementDate) customer.agreementDate = new Date(agreementDate);
    if (remarks !== undefined) customer.remarks = remarks;

    // Handle Photo change
    if (req.files && req.files.photo) {
      customer.photoUrl = `/uploads/photos/${req.files.photo[0].filename}`;
    } else if (req.body.photoData) {
      const base64Data = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
      const filename = `photo-live-${Date.now()}.jpg`;
      const filepath = `storage/uploads/photos/${filename}`;
      fs.writeFileSync(filepath, base64Data, { encoding: 'base64' });
      customer.photoUrl = `/uploads/photos/${filename}`;
    }

    // Handle Document uploads (append)
    if (req.files) {
      if (req.files.aadhaarDoc) {
        customer.documents.push({
          docType: 'aadhaar',
          fileUrl: `/uploads/docs/${req.files.aadhaarDoc[0].filename}`
        });
      }
      if (req.files.agreementDoc) {
        customer.documents.push({
          docType: 'agreement',
          fileUrl: `/uploads/docs/${req.files.agreementDoc[0].filename}`
        });
      }
      if (req.files.otherDoc) {
        customer.documents.push({
          docType: 'other',
          fileUrl: `/uploads/docs/${req.files.otherDoc[0].filename}`
        });
      }
    }

    await customer.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_CUSTOMER',
      module: 'Customer',
      customerId: customer._id,
      remarks: `Updated details for customer: ${customer.name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Soft Delete Customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    await customer.save();

    // If customer occupies a locker, free the locker
    if (customer.lockerId) {
      const locker = await Locker.findById(customer.lockerId);
      if (locker) {
        locker.status = 'available';
        locker.assignedCustomerId = null;
        locker.assignmentDate = null;
        locker.history.push({
          customerId: customer._id,
          customerName: customer.name,
          action: 'vacated',
          remarks: 'Locker vacated due to customer deletion'
        });
        await locker.save();
      }
      customer.lockerId = null;
      await customer.save();
    }

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'DELETE_CUSTOMER',
      module: 'Customer',
      customerId: customer._id,
      remarks: `Soft-deleted customer: ${customer.name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Beneficiary - Add
export const addBeneficiary = async (req, res) => {
  try {
    const { name, relationship, mobile, aadhaarNumber } = req.body;
    const customerId = req.params.id;

    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    let photoUrl = '';
    if (req.files && req.files.beneficiaryPhoto) {
      photoUrl = `/uploads/photos/${req.files.beneficiaryPhoto[0].filename}`;
    } else if (req.body.photoData) {
      const base64Data = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
      const filename = `photo-beneficiary-${Date.now()}.jpg`;
      const filepath = `storage/uploads/photos/${filename}`;
      fs.writeFileSync(filepath, base64Data, { encoding: 'base64' });
      photoUrl = `/uploads/photos/${filename}`;
    } else {
      return res.status(400).json({ success: false, error: 'Beneficiary photo is required' });
    }

    const beneficiary = await Beneficiary.create({
      customerId,
      name,
      relationship,
      mobile,
      aadhaarNumber,
      photoUrl,
      status: 'active'
    });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'ADD_BENEFICIARY',
      module: 'Customer',
      customerId,
      remarks: `Added beneficiary: ${name} for customer: ${customer.name}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Beneficiary - Update
export const updateBeneficiary = async (req, res) => {
  try {
    const { name, relationship, mobile, aadhaarNumber, status } = req.body;
    
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, isDeleted: false });
    if (!beneficiary) {
      return res.status(404).json({ success: false, error: 'Beneficiary not found' });
    }

    if (name) beneficiary.name = name;
    if (relationship) beneficiary.relationship = relationship;
    if (mobile) beneficiary.mobile = mobile;
    if (aadhaarNumber) beneficiary.aadhaarNumber = aadhaarNumber;
    if (status) beneficiary.status = status;

    if (req.files && req.files.beneficiaryPhoto) {
      beneficiary.photoUrl = `/uploads/photos/${req.files.beneficiaryPhoto[0].filename}`;
    } else if (req.body.photoData) {
      const base64Data = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
      const filename = `photo-beneficiary-${Date.now()}.jpg`;
      const filepath = `storage/uploads/photos/${filename}`;
      fs.writeFileSync(filepath, base64Data, { encoding: 'base64' });
      beneficiary.photoUrl = `/uploads/photos/${filename}`;
    }

    await beneficiary.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_BENEFICIARY',
      module: 'Customer',
      customerId: beneficiary.customerId,
      remarks: `Updated beneficiary: ${beneficiary.name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Beneficiary - Delete
export const deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, isDeleted: false });
    if (!beneficiary) {
      return res.status(404).json({ success: false, error: 'Beneficiary not found' });
    }

    beneficiary.isDeleted = true;
    await beneficiary.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'DELETE_BENEFICIARY',
      module: 'Customer',
      customerId: beneficiary.customerId,
      remarks: `Deleted beneficiary: ${beneficiary.name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Beneficiary deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
