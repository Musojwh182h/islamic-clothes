FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_AUTH_API_URL=http://localhost:8102/api/v1/auth
ARG VITE_CATALOG_API_URL=http://localhost:8101/api/v1/catalog
ARG VITE_ORDERS_API_URL=http://localhost:8103/api/v1/orders
ARG VITE_MEDIA_PUBLIC_BASE_URL=http://localhost:9000/sabr-product-media

ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL \
    VITE_CATALOG_API_URL=$VITE_CATALOG_API_URL \
    VITE_ORDERS_API_URL=$VITE_ORDERS_API_URL \
    VITE_MEDIA_PUBLIC_BASE_URL=$VITE_MEDIA_PUBLIC_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
