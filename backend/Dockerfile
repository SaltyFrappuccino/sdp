# Используем официальный Node.js образ
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем TypeScript код
RUN npm run build

# Создаем директорию для базы данных
RUN mkdir -p /app/data

# Открываем порт 3000
EXPOSE 3000

# Устанавливаем переменную окружения для базы данных
ENV NODE_ENV=production

# Запускаем приложение
CMD ["npm", "start"]
