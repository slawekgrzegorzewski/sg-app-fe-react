FROM node:24.13.1-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run codegen \
 && npm run build-prod


FROM nginx:1.25.4-bookworm

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/ /usr/share/nginx/html/

EXPOSE 80