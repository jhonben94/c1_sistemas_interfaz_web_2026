# Etapa: compilar Angular
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Imagen final: nginx (puerto 80) + API Node en 3000 (solo localhost)
FROM node:22-alpine

RUN apk add --no-cache nginx wget

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/index.mjs server/tree.json ./

WORKDIR /app

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY nginx.docker.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/dist/chessy/browser /usr/share/nginx/html

ENV NODE_ENV=production
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
