const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['chaquetas', 'overoles', 'chalecos', 'pantalones', 'camisas', 'otros'],
    },
    description: { type: String },
    imageUrl: { type: String },
    publicId: { type: String },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);
