FROM node:20-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=9002

# Install dependencies first (use package*.json so build cache works)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy rest of the app
COPY . .

EXPOSE 9002

CMD ["npm", "run", "dev"]
