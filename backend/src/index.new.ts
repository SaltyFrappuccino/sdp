// Main entry point for the refactored backend

import express from 'express';
import cors from 'cors';
import { getDbConnection } from './database/connection.js';
import { runMigrations } from './database/migrations.js';
import router from './routes/index.js';
import { startMarketEngine } from './engines/market.engine.js';
import { startCryptoEngine } from './engines/crypto.engine.js';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Anketnica API',
      version: '2.0.0',
      description: 'Refactored API for VK Mini App Anketnica',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount API routes
app.use('/api', router);

// Health check (root level)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Anketnica Backend v2.0' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Anketnica Backend v2.0...');

    // Initialize database
    console.log('📦 Initializing database...');
    await getDbConnection();
    await runMigrations(await getDbConnection());
    console.log('✅ Database initialized');

    // Start background engines
    console.log('🔧 Starting background engines...');
    startMarketEngine();
    startCryptoEngine();
    console.log('✅ Background engines started');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log('✨ Refactored backend is ready!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

