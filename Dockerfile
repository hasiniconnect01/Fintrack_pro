# ==========================
# Stage 1 - Build React Frontend
# ==========================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

RUN npm run build

# ==========================
# Stage 2 - Build Spring Boot
# ==========================
FROM maven:3.9-eclipse-temurin-17 AS backend-builder

WORKDIR /app

COPY pom.xml ./

RUN mvn dependency:go-offline -B

COPY src ./src

COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static

RUN mvn clean package -DskipTests

# ==========================
# Stage 3 - Run Application
# ==========================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install OCR Engine + English Language Data
RUN apk update && \
    apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng

COPY --from=backend-builder /app/target/finance-tracker-0.0.1-SNAPSHOT.jar app.jar

# Tesseract language data path
ENV TESSDATA_PATH=/usr/share/tesseract-ocr/5/tessdata

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]