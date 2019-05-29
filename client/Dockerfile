FROM node:11-stretch
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
COPY . .
RUN npx webpack