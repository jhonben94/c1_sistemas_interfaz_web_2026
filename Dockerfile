# Etapa de compilación
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Imagen final: solo estáticos con nginx
FROM nginx:1.27-alpine

COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/chessy/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
