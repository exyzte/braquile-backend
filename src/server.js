require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/auth.routes');
const heroRoutes = require('./routes/hero.routes');
const promotionRoutes = require('./routes/promotion.routes');
const productRoutes = require('./routes/product.routes');
const quoteRoutes = require('./routes/quote.routes');

const app = express();

// Middleware
// Set security HTTP headers
app.use(helmet());

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:3000';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim().replace(/\/$/, ''))
  : [clientUrl, 'http://localhost:3000', 'https://www.dotacionesbraquile.com'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server or same-origin requests
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy does not allow access from ${origin}`));
  },
  credentials: true,
}));
app.options('*', cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotes', quoteRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.setHeader('X-Allowed-Origins', allowedOrigins.join(','));
  res.json({ status: 'OK', message: 'Braquile API running', timestamp: new Date(), allowedOrigins });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
