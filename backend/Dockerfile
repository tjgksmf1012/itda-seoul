FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/package.json

RUN npm install

COPY backend ./backend

WORKDIR /app/backend

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]
