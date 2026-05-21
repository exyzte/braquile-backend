const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const InviteSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InviteSchema.methods.matchCode = async function (code) {
  return await bcrypt.compare(code, this.codeHash);
};

module.exports = mongoose.model('Invite', InviteSchema);
