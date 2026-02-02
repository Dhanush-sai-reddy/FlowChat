FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g typescript
RUN npm install

COPY . .

# Build TypeScript
RUN npm run build || tsc # Fallback if build script missing

EXPOSE 3000

CMD ["npm", "start"]
