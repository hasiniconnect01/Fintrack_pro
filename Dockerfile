# ---------- Stage 1 : Build React ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./

# Build frontend (Vite outputs directly to src/main/resources/static)
RUN npm run build

# ---------- Stage 2 : Build Spring Boot ----------
FROM maven:3.9-eclipse-temurin-17 AS backend-builder

WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline -B

COPY src ./src

# Frontend has already written files into src/main/resources/static
RUN mvn clean package -DskipTests

# ---------- Stage 3 : Run ----------
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install Tesseract OCR
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng

ENV TESSDATA_PATH=/usr/share/tessdata

COPY --from=backend-builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]