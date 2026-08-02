import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload folders exist
const createFolders = () => {
  const dirs = [
    'storage/uploads/photos',
    'storage/uploads/docs'
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
createFolders();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photo' || file.fieldname === 'beneficiaryPhoto' || file.fieldname === 'capturedPhoto') {
      cb(null, 'storage/uploads/photos');
    } else {
      cb(null, 'storage/uploads/docs');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'photo' || file.fieldname === 'beneficiaryPhoto' || file.fieldname === 'capturedPhoto') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed for photos'), false);
    }
  } else {
    // Documents
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs or images are allowed for documents'), false);
    }
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
