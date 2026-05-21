const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Admin = require('../models/Admin.model');
const Invite = require('../models/Invite.model');
const { protect, authorizeSuperadmin } = require('../middleware/auth.middleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter.middleware');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const generateInviteCode = () => crypto.randomBytes(18).toString('hex');

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/; // 10+ chars, upper, lower, digit, special


// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ message: 'Credenciales inválidas' });

  if (admin.isLocked) {
    return res.status(423).json({ message: 'Cuenta bloqueada temporalmente. Intenta de nuevo más tarde.' });
  }

  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    await admin.incrementFailedLogins();
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  if (!admin.isApproved) {
    return res.status(403).json({ message: 'Cuenta en espera de aprobación por el Superadmin.' });
  }

  await admin.resetLoginAttempts();

  const token = signToken(admin._id);
  res.json({
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});

// POST /api/auth/change-password
router.post('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' });
  }

  if (!PASSWORD_POLICY.test(newPassword)) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 10 caracteres e incluir mayúsculas, minúsculas, números y símbolos.',
    });
  }

  const admin = await Admin.findById(req.admin._id);
  if (!admin) return res.status(404).json({ message: 'Admin no encontrado' });

  const isMatch = await admin.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Contraseña actual incorrecta' });
  }

  admin.password = newPassword;
  await admin.save();
  await admin.resetLoginAttempts();

  res.json({ message: 'Contraseña actualizada correctamente' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, resetSecret } = req.body;
  if (!email || !newPassword || !resetSecret) {
    return res.status(400).json({ message: 'Email, nueva contraseña y resetSecret son requeridos' });
  }

  if (resetSecret !== process.env.ADMIN_RESET_SECRET) {
    return res.status(403).json({ message: 'Secret inválido' });
  }

  if (!PASSWORD_POLICY.test(newPassword)) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 10 caracteres e incluir mayúsculas, minúsculas, números y símbolos.',
    });
  }

  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(404).json({ message: 'Admin no encontrado' });
  }

  admin.password = newPassword;
  await admin.save();
  await admin.resetLoginAttempts();

  res.json({ message: 'Contraseña restablecida correctamente' });
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, name, inviteCode } = req.body;
  const exists = await Admin.findOne({ email });
  if (exists) return res.status(400).json({ message: 'El usuario ya existe' });

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
  }

  if (!PASSWORD_POLICY.test(password)) {
    return res.status(400).json({
      message: 'La contraseña debe tener al menos 10 caracteres e incluir mayúsculas, minúsculas, números y símbolos.',
    });
  }

  const adminCount = await Admin.countDocuments();
  const isFirst = adminCount === 0;
  let invite = null;

  if (!isFirst) {
    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code required' });
    }

    const activeInvites = await Invite.find({ isUsed: false, expiresAt: { $gt: new Date() } });
    for (const candidate of activeInvites) {
      if (await candidate.matchCode(inviteCode)) {
        invite = candidate;
        break;
      }
    }

    if (!invite) {
      return res.status(400).json({ message: 'Invite code inválido o expirado' });
    }
  }

  const admin = await Admin.create({
    email,
    password,
    name,
    role: isFirst ? 'superadmin' : 'admin',
    isApproved: isFirst ? true : false,
  });

  if (invite) {
    invite.isUsed = true;
    invite.usedBy = admin._id;
    invite.usedAt = new Date();
    await invite.save();
  }

  if (isFirst) {
    const token = signToken(admin._id);
    return res.status(201).json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      message: 'Cuenta creada como Superadmin',
    });
  }

  return res.status(201).json({
    message: 'Cuenta creada. En espera de aprobación por el Superadmin.',
  });
});

// POST /api/auth/invites (Superadmin only)
router.post('/invites', protect, authorizeSuperadmin, async (req, res) => {
  try {
    const { role = 'admin', expiresInDays = 7 } = req.body;
    const code = generateInviteCode();
    const codeHash = await bcrypt.hash(code, 12);

    const invite = await Invite.create({
      codeHash,
      role,
      createdBy: req.admin._id,
      expiresAt: new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      invite: {
        id: invite._id,
        role: invite.role,
        createdBy: req.admin._id,
        expiresAt: invite.expiresAt,
        isUsed: invite.isUsed,
        createdAt: invite.createdAt,
      },
      inviteCode: code,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/invites (Superadmin only)
router.get('/invites', protect, authorizeSuperadmin, async (req, res) => {
  const invites = await Invite.find().populate('createdBy', 'name email').populate('usedBy', 'name email').sort({ createdAt: -1 });
  res.json(invites.map(i => ({
    _id: i._id,
    role: i.role,
    isUsed: i.isUsed,
    createdBy: i.createdBy,
    usedBy: i.usedBy,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
    usedAt: i.usedAt,
  })));
});

// DELETE /api/auth/invites/:id (Superadmin only)
router.delete('/invites/:id', protect, authorizeSuperadmin, async (req, res) => {
  const invite = await Invite.findById(req.params.id);
  if (!invite) return res.status(404).json({ message: 'Invite no encontrado' });
  await invite.deleteOne();
  res.json({ message: 'Invite eliminado' });
});

// GET /api/auth/admins (Superadmin only)
router.get('/admins', protect, authorizeSuperadmin, async (req, res) => {
  const admins = await Admin.find({}).select('-password');
  res.json(admins);
});

// PUT /api/auth/admins/:id/approve (Superadmin only)
router.put('/admins/:id/approve', protect, authorizeSuperadmin, async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: 'Admin no encontrado' });
  
  admin.isApproved = true;
  await admin.save();
  res.json({ message: 'Admin aprobado exitosamente', admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, isApproved: admin.isApproved } });
});

// DELETE /api/auth/admins/:id (Superadmin only)
router.delete('/admins/:id', protect, authorizeSuperadmin, async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: 'Admin no encontrado' });
  if (admin.role === 'superadmin') return res.status(400).json({ message: 'No se puede eliminar al superadmin' });

  await admin.deleteOne();
  res.json({ message: 'Admin eliminado' });
});

// GET /api/auth/me  (protected)
router.get('/me', protect, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
