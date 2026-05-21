const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so we can pipe to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

const uploadToCloudinary = (buffer, folder = process.env.CLOUDINARY_FOLDER || 'braquile') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'image' }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      })
      .end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
