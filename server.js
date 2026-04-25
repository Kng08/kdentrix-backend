const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();

// ── Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests, please try again later.' });
app.use('/api/', limiter);

// ── MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── API Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// ── Health check
app.get('/api/health', (req, res) => res.json({ status: 'K-Dentrix API is running 🦷', time: new Date() }));

// ── Admin dashboard UI
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ── Serve React frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// ── SPA fallback – send all non-API requests to React's index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('❌ public/index.html not found – frontend was not built or copied correctly');
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>K-Dentrix – Unavailable</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px">
          <h1>Frontend Unavailable</h1>
          <p>The frontend assets could not be loaded. The API is still running.</p>
          <p>Please check the build logs or contact support.</p>
          <p><a href="/api/health">API Health Check</a></p>
        </body>
      </html>
    `);
  }
});

// ── Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 K-Dentrix server running on port ${PORT}`));
