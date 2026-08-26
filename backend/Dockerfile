FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 5000

# Run migrations and seed data before starting the server
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]
