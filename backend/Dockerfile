FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# Remove devDependencies after build
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "src/scripts/startup.js"]
