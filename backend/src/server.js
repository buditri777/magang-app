const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use('/api', limiter);

// Static uploads (for file downloads, with auth check in routes)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'magang-api', time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/dosen', require('./routes/dosen'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`✓ Magang API running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
});
