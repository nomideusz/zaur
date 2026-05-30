FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openldap-clients

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY . .

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
