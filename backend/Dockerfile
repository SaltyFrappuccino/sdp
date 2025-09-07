# Используем официальный Node.js образ
FROM node:20-alpine

# Устанавливаем необходимые пакеты для компиляции sqlite3
RUN apk add --no-cache python3 py3-pip make gcc g++ musl-dev

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --omit=dev

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
