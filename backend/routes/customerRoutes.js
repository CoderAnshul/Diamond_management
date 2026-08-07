import express from 'express';
import {
  getCustomers,
  getCustomerById,
  registerCustomer,
  updateCustomer,
  deleteCustomer,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} from '../controllers/customerController.js';
import { protect, checkPermission } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const fileUploads = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'beneficiaryPhoto', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'aadhaarDoc', maxCount: 1 },
  { name: 'agreementDoc', maxCount: 1 },
  { name: 'otherDoc', maxCount: 1 }
]);

router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomerById);
router.post('/', protect, checkPermission('canRegisterCustomer'), fileUploads, registerCustomer);
router.put('/:id', protect, checkPermission('canEditCustomer'), fileUploads, updateCustomer);
router.delete('/:id', protect, checkPermission('canDeleteCustomer'), deleteCustomer);

router.post('/:id/beneficiaries', protect, checkPermission('canEditCustomer'), fileUploads, addBeneficiary);
router.put('/beneficiaries/:id', protect, checkPermission('canEditCustomer'), fileUploads, updateBeneficiary);
router.delete('/beneficiaries/:id', protect, checkPermission('canEditCustomer'), deleteBeneficiary);

export default router;
