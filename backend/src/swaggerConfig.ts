import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Anketnica API',
      version: '1.0.0',
      description: 'API for the VK Mini App Anketnica',
    },
    servers: [
      {
        url: 'http://193.162.143.80',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./dist/api.js'], // Указываем путь к скомпилированным файлам
};

export const swaggerSpec = swaggerJsdoc(options);