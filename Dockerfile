FROM node:11-stretch

COPY . .
RUN npm install
RUN npx webpack