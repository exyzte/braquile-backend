const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote.model');
const { protect } = require('../middleware/auth.middleware');

// PUBLIC: POST /api/quotes — submit a new quote request
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, message } = req.body;

    if (!name || !company || !email || !phone || !message) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const quote = await Quote.create({
      name,
      company,
      email,
      phone,
      message,
      status: 'new',
    });

    res.status(201).json({
      message: 'Cotización recibida. Te contactaremos pronto.',
      quote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: GET /api/quotes — fetch all quotes
router.get('/', protect, async (req, res) => {
  try {
    const quotes = await Quote.find()
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: GET /api/quotes/:id — fetch single quote
router.get('/:id', protect, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('assignedTo', 'name email');

    if (!quote) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: PATCH /api/quotes/:id — update quote status & notes
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, notes, assignedTo } = req.body;

    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    if (status) quote.status = status;
    if (notes !== undefined) quote.notes = notes;
    if (assignedTo !== undefined) quote.assignedTo = assignedTo;

    await quote.save();

    await quote.populate('assignedTo', 'name email');

    res.json({
      message: 'Cotización actualizada',
      quote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: DELETE /api/quotes/:id — delete a quote
router.delete('/:id', protect, async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);

    if (!quote) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    res.json({ message: 'Cotización eliminada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
