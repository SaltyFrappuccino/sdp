import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './database.js';
import apiRouter from './api.js';
import { swaggerSpec } from './swaggerConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors({
  origin: [
    'https://sdp-ten-sand.vercel.app',
    /https:\/\/prod-app53964840-.*\.pages-ac\.vk-apps\.com/
  ]
}));
app.use(express.json());

// Раздача статичных файлов из папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Обслуживание API
app.use('/api', apiRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



async function startServer() {
  try {
    await initDB();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running at http://localhost:${port}`);
      console.log(`API is available at http://localhost:${port}/api`);
      console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();