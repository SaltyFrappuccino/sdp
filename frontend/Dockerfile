# Используем официальный образ Node.js.
# https://hub.docker.com/_/node
FROM node:20-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Открываем порт, на котором работает приложение
EXPOSE 5173

# Команда для запуска приложения
CMD [ "npm", "run", "start" ]