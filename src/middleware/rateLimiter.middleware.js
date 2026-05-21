const rateLimit = require('express-rate-limit');

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});
