const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['new', 'contacted', 'closed'],
      default: 'new' 
    },
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quote', QuoteSchema);
