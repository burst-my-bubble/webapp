FROM node:11-stretch AS build-stage

COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
COPY . .
RUN npm install
RUN npx webpack