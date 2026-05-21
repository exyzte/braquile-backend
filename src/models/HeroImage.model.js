const mongoose = require('mongoose');

const HeroImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    altText: { type: String, required: true, default: 'Hero image' },
    order: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: true },
    publicId: { type: String }, // Cloudinary public_id for deletion
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeroImage', HeroImageSchema);
