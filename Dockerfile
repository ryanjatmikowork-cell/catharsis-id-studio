FROM node:20-alpine
RUN apk add --no-cache ffmpeg tzdata
ENV TZ=Asia/Jakarta
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
