FROM node:20.18.1-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY engine.js yayinci.js ./
CMD ["node", "yayinci.js"]
