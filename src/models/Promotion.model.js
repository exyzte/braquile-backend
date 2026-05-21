const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    discountPct: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: false },
    endDate: { type: Date, required: true },
    badgeColor: { type: String, default: '#FFCC00' },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', PromotionSchema);
