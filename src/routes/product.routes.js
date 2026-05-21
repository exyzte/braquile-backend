const express = require('express');
const router = express.Router();
const Product = require('../models/Product.model');
const { protect } = require('../middleware/auth.middleware');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload.middleware');

// PUBLIC: GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: POST /api/products
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;
    let publicId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'braquile/products');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const product = await Product.create({ ...req.body, imageUrl, publicId });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: PATCH /api/products/:id
router.patch('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let imageUrl = req.body.imageUrl || product.imageUrl;
    let publicId = product.publicId;

    if (req.file) {
      if (product.publicId) await deleteFromCloudinary(product.publicId);
      const result = await uploadToCloudinary(req.file.buffer, 'braquile/products');
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, imageUrl, publicId },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ADMIN: DELETE /api/products/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.publicId) await deleteFromCloudinary(product.publicId);
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
