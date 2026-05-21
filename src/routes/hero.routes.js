const express = require('express');
const router = express.Router();
const HeroImage = require('../models/HeroImage.model');
const { protect } = require('../middleware/auth.middleware');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload.middleware');

// PUBLIC: GET /api/hero — fetch active images ordered
router.get('/', async (req, res) => {
  try {
    const images = await HeroImage.find({ active: true }).sort({ order: 1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: GET /api/hero/all — fetch all images
router.get('/all', protect, async (req, res) => {
  try {
    const images = await HeroImage.find().sort({ order: 1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: POST /api/hero — upload new hero image
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    let url = req.body.url;
    let publicId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'braquile/hero');
      url = result.secure_url;
      publicId = result.public_id;
    }

    const count = await HeroImage.countDocuments();
    const image = await HeroImage.create({
      url,
      altText: req.body.altText || 'Hero image',
      order: count,
      active: req.body.active !== 'false',
      publicId,
    });
    res.status(201).json(image);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: PATCH /api/hero/:id — update image metadata
router.patch('/:id', protect, async (req, res) => {
  try {
    const image = await HeroImage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!image) return res.status(404).json({ message: 'Hero image not found' });
    res.json(image);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: DELETE /api/hero/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const image = await HeroImage.findById(req.params.id);
    if (!image) return res.status(404).json({ message: 'Hero image not found' });
    if (image.publicId) await deleteFromCloudinary(image.publicId);
    await image.deleteOne();
    res.json({ message: 'Hero image deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: PATCH /api/hero/reorder — update order array [{id, order}]
router.patch('/reorder/batch', protect, async (req, res) => {
  try {
    const { items } = req.body; // [{ id, order }]
    await Promise.all(
      items.map(({ id, order }) => HeroImage.findByIdAndUpdate(id, { order }))
    );
    res.json({ message: 'Order updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
