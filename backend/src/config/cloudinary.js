/**
 * Cloudinary Configuration for File Uploads
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'campus_connect';
    let resourceType = 'auto';
    let format;

    // Determine folder and resource type based on file type
    if (file.mimetype.startsWith('image/')) {
      folder = 'campus_connect/images';
      format = 'jpg';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'campus_connect/documents';
      resourceType = 'raw';
    }

    return {
      folder,
      resource_type: resourceType,
      format: format,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF files are allowed.'), false);
  }
};

// Configure multer with size limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = {
  cloudinary,
  upload
};
