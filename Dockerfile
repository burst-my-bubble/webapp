FROM node:11-stretch AS build-stage

COPY . .
RUN npm install
RUN npx webpack

FROM nginx
COPY --from=build-stage static /usr/share/nginx/html
COPY --from=build-stage nginx.conf /etc/nginx/conf.d/default.conf