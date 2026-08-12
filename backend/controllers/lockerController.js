import Locker from '../models/Locker.js';
import Customer from '../models/Customer.js';
import { logActivity } from '../utils/activityLogger.js';

export const getLockers = async (req, res) => {
  const { status, search } = req.query;
  try {
    const query = {};
    if (status) query.status = status;
    if (search) query.lockerNumber = { $regex: search, $options: 'i' };

    const lockers = await Locker.find(query)
      .populate('assignedCustomerId', 'name mobile photoUrl')
      .sort({ lockerNumber: 1 });

    res.status(200).json({ success: true, lockers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLockerById = async (req, res) => {
  try {
    const locker = await Locker.findById(req.params.id)
      .populate('assignedCustomerId', 'name mobile photoUrl aadhaarNumber depositAmount');

    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    res.status(200).json({ success: true, locker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLocker = async (req, res) => {
  const { lockerNumber, startNumber, endNumber, size, status, keyNumber } = req.body;
  const finalSize = size !== undefined ? size : 'a';

  try {
    // Range-based bulk locker creation
    if (startNumber !== undefined && endNumber !== undefined) {
      const start = parseInt(startNumber);
      const end = parseInt(endNumber);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ success: false, error: 'Start and End numbers must be valid integers' });
      }

      if (start > end) {
        return res.status(400).json({ success: false, error: 'Start number cannot be greater than End number' });
      }

      // Generate range
      const lockerNumbersToCreate = [];
      for (let i = start; i <= end; i++) {
        lockerNumbersToCreate.push(String(i));
      }

      // Check which ones already exist
      const existingLockers = await Locker.find({ lockerNumber: { $in: lockerNumbersToCreate } });
      const existingNumbers = new Set(existingLockers.map(l => l.lockerNumber));

      // Filter out existing ones
      const numbersToInsert = lockerNumbersToCreate.filter(num => !existingNumbers.has(num));

      if (numbersToInsert.length === 0) {
        return res.status(400).json({ success: false, error: 'All lockers in this range already exist' });
      }

      // Prepare documents
      const docs = numbersToInsert.map(num => ({
        lockerNumber: num,
        size: finalSize,
        status: status || 'available'
      }));

      const createdLockers = await Locker.insertMany(docs);

      await logActivity({
        userId: req.user._id,
        username: req.user.username,
        action: 'CREATE_LOCKER',
        module: 'Locker',
        remarks: `Created range ${start} to ${end} (${createdLockers.length} new lockers)`,
        ipAddress: req.ip
      });

      return res.status(201).json({
        success: true,
        message: `Successfully created ${createdLockers.length} new lockers in the range ${start} to ${end}`,
        lockers: createdLockers
      });
    }

    // Single locker creation fallback
    if (!lockerNumber) {
      return res.status(400).json({ success: false, error: 'Please provide locker number or range values' });
    }

    const existing = await Locker.findOne({ lockerNumber });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Locker number already exists' });
    }

    if (keyNumber && keyNumber.trim() !== '') {
      const existingKey = await Locker.findOne({ keyNumber: { $regex: new RegExp(`^${keyNumber.trim()}$`, 'i') } });
      if (existingKey) {
        return res.status(400).json({ success: false, error: `Key number "${keyNumber}" already exists on Locker ${existingKey.lockerNumber}` });
      }
    }

    const locker = await Locker.create({
      lockerNumber,
      size: finalSize,
      status: status || 'available',
      keyNumber: keyNumber ? keyNumber.trim() : ''
    });

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'CREATE_LOCKER',
      module: 'Locker',
      lockerId: locker._id,
      remarks: `Created locker: ${lockerNumber} (Size: ${finalSize}${keyNumber ? `, Key: ${keyNumber}` : ''})`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, locker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocker = async (req, res) => {
  const { size, status, remarks, keyNumber } = req.body;
  try {
    const locker = await Locker.findById(req.params.id);
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    if (locker.status === 'occupied' && status === 'available') {
      return res.status(400).json({ success: false, error: 'Cannot mark occupied locker as available directly. Please vacate the locker instead.' });
    }

    if (size) locker.size = size;
    if (status) locker.status = status;

    if (keyNumber !== undefined && keyNumber.trim() !== '') {
      const existingKey = await Locker.findOne({
        _id: { $ne: req.params.id },
        keyNumber: { $regex: new RegExp(`^${keyNumber.trim()}$`, 'i') }
      });
      if (existingKey) {
        return res.status(400).json({ success: false, error: `Key number "${keyNumber}" already exists on Locker ${existingKey.lockerNumber}` });
      }
      locker.keyNumber = keyNumber.trim();
    } else if (keyNumber === '') {
      locker.keyNumber = '';
    }

    await locker.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'UPDATE_LOCKER',
      module: 'Locker',
      lockerId: locker._id,
      remarks: `Updated locker ${locker.lockerNumber}: Status=${locker.status}, Size=${locker.size}, Key=${locker.keyNumber || 'None'}. Remarks: ${remarks || ''}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, locker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLocker = async (req, res) => {
  try {
    const locker = await Locker.findById(req.params.id);
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    if (locker.status === 'occupied') {
      return res.status(400).json({ success: false, error: 'Cannot delete an occupied locker. Vacate the customer first.' });
    }

    await Locker.findByIdAndDelete(req.params.id);

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'DELETE_LOCKER',
      module: 'Locker',
      remarks: `Deleted locker: ${locker.lockerNumber}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Locker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign locker
export const assignLocker = async (req, res) => {
  const { customerId, remarks } = req.body;
  const lockerId = req.params.id;
  try {
    const locker = await Locker.findById(lockerId);
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    if (locker.status !== 'available') {
      return res.status(400).json({ success: false, error: `Locker is not available (Status: ${locker.status})` });
    }

    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    if (customer.lockerId) {
      return res.status(400).json({ success: false, error: 'Customer already has a locker assigned. Use Transfer Locker instead.' });
    }

    locker.status = 'occupied';
    locker.assignedCustomerId = customer._id;
    locker.assignmentDate = new Date();
    locker.history.push({
      customerId: customer._id,
      customerName: customer.name,
      action: 'assigned',
      remarks: remarks || 'Assigned via Locker assignment'
    });
    await locker.save();

    customer.lockerId = locker._id;
    await customer.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'ASSIGN_LOCKER',
      module: 'Locker',
      customerId: customer._id,
      lockerId: locker._id,
      remarks: `Assigned locker ${locker.lockerNumber} to customer ${customer.name}. Remarks: ${remarks || ''}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, locker, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// Vacate locker
export const vacateLocker = async (req, res) => {
  const { remarks } = req.body;
  const lockerId = req.params.id;
  try {
    const locker = await Locker.findById(lockerId);
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }

    if (locker.status !== 'occupied' || !locker.assignedCustomerId) {
      return res.status(400).json({ success: false, error: 'Locker is not occupied' });
    }

    const customer = await Customer.findById(locker.assignedCustomerId);
    const customerId = locker.assignedCustomerId;
    const customerName = customer ? customer.name : 'Unknown';

    let documentUrl = null;
    if (req.file) {
      documentUrl = `/uploads/docs/${req.file.filename}`;
    }

    locker.status = 'available';
    locker.assignedCustomerId = null;
    locker.assignmentDate = null;
    locker.history.push({
      customerId: customerId,
      customerName: customerName,
      action: 'vacated',
      remarks: remarks || 'Vacated locker',
      documentUrl: documentUrl
    });
    await locker.save();

    if (customer) {
      customer.lockerId = null;
      if (documentUrl) {
        customer.documents.push({
          docType: 'vacate',
          fileUrl: documentUrl
        });
      }
      await customer.save();
    }

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'VACATE_LOCKER',
      module: 'Locker',
      customerId: customerId,
      lockerId: locker._id,
      remarks: `Vacated locker ${locker.lockerNumber} of customer ${customerName}. Remarks: ${remarks || ''}${documentUrl ? ` | Document uploaded: ${documentUrl}` : ''}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, locker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Transfer locker
export const transferLocker = async (req, res) => {
  const { newLockerId, remarks } = req.body;
  const oldLockerId = req.params.id;
  try {
    const oldLocker = await Locker.findById(oldLockerId);
    if (!oldLocker || oldLocker.status !== 'occupied' || !oldLocker.assignedCustomerId) {
      return res.status(400).json({ success: false, error: 'Origin locker must be occupied' });
    }

    const newLocker = await Locker.findById(newLockerId);
    if (!newLocker || newLocker.status !== 'available') {
      return res.status(400).json({ success: false, error: 'Destination locker must be available' });
    }

    const customerId = oldLocker.assignedCustomerId;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const transferDate = new Date();

    oldLocker.status = 'available';
    oldLocker.assignedCustomerId = null;
    oldLocker.assignmentDate = null;
    oldLocker.history.push({
      customerId: customer._id,
      customerName: customer.name,
      action: 'vacated',
      remarks: `Transferred out to ${newLocker.lockerNumber}. Remarks: ${remarks || ''}`
    });
    await oldLocker.save();

    newLocker.status = 'occupied';
    newLocker.assignedCustomerId = customer._id;
    newLocker.assignmentDate = transferDate;
    newLocker.history.push({
      customerId: customer._id,
      customerName: customer.name,
      action: 'assigned',
      remarks: `Transferred in from ${oldLocker.lockerNumber}. Remarks: ${remarks || ''}`
    });
    await newLocker.save();

    customer.lockerId = newLocker._id;
    await customer.save();

    await logActivity({
      userId: req.user._id,
      username: req.user.username,
      action: 'TRANSFER_LOCKER',
      module: 'Locker',
      customerId: customer._id,
      remarks: `Transferred locker assignment from ${oldLocker.lockerNumber} to ${newLocker.lockerNumber}. Remarks: ${remarks || ''}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, oldLocker, newLocker, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
