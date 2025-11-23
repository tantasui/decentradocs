import express from 'express';
import cors from 'cors';
import config from './config.js';
import routes from './routes/index.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mount routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.debug ? err.message : 'An unexpected error occurred',
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   DecentraDocs API (Express.js)                                ║
║                                                                ║
║   Server running on: http://localhost:${config.port.toString().padEnd(24)}║
║                                                                ║
║   Walrus Publisher: ${config.walrusPublisherUrl.substring(0, 40).padEnd(41)}║
║   Walrus Aggregator: ${config.walrusAggregatorUrl.substring(0, 39).padEnd(40)}║
║                                                                ║
║   CORS Origins: ${config.corsOrigins.join(', ').substring(0, 43).padEnd(44)}║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
