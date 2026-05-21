const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    name: { type: String, required: true },
    role: { type: String, default: 'admin' },
    isApproved: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before save
AdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
AdminSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

AdminSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

AdminSchema.methods.incrementFailedLogins = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    this.failedLoginAttempts = 0;
  }
  await this.save();
};

AdminSchema.methods.resetLoginAttempts = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

module.exports = mongoose.model('Admin', AdminSchema);
