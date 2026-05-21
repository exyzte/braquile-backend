const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion.model');
const { protect } = require('../middleware/auth.middleware');

// PUBLIC: GET /api/promotions — active promotions not expired
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const promos = await Promotion.find({ isActive: true, endDate: { $gt: now } }).sort({
      createdAt: -1,
    });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: GET /api/promotions/all
router.get('/all', protect, async (req, res) => {
  try {
    const promos = await Promotion.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: POST /api/promotions
router.post('/', protect, async (req, res) => {
  try {
    const promo = await Promotion.create(req.body);
    res.status(201).json(promo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: PATCH /api/promotions/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    res.json(promo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: DELETE /api/promotions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    res.json({ message: 'Promotion deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
