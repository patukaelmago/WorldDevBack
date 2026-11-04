require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { conn } = require('./db');
const server = express();
server.disable('x-powered-by');
const origins = (process.env.CORS_URL || 'https://world-dev-front-delta.vercel.app').split(',').map(s => s.trim());
server.use(cors({ origin(origin, cb) { cb(null, !origin || origins.includes(origin)); }, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
server.use(express.json({ limit: '2mb' }));
server.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  next();
});
server.get('/health', async (req, res) => {
  try { await conn.authenticate(); res.json({ status: 'ok', service: 'world-developers', demo: true }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
server.use('/', require('./routes'));
server.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
server.use((error, req, res, next) => {
  const status = error.status || (error.name?.includes('Validation') || error.name?.includes('DatabaseError') ? 400 : 500);
  // Never log tokens, query parameters, connection URLs, or request bodies.
  if (status >= 500) console.error('Request failed:', error.name || 'Error');
  res.status(status).json({ message: status >= 500 ? 'The service could not complete this request. Please try again.' : error.message || String(error) });
});
module.exports = server;
