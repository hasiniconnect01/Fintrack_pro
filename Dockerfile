# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN mkdir -p ../src/main/resources/static
RUN npm run build

# Stage 2: Build the Spring Boot application
FROM maven:3.9-eclipse-temurin-17 AS backend-builder
WORKDIR /app
COPY pom.xml ./
# Pre-fetch maven dependencies
RUN mvn dependency:go-offline -B
COPY src ./src
# Copy compiled frontend static assets from stage 1 into Spring Boot resources
COPY --from=frontend-builder /app/src/main/resources/static ./src/main/resources/static
RUN mvn package -DskipTests -B

# Stage 3: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Install Tesseract OCR if needed (since the properties file mentions OCR/Tesseract)
RUN apk add --no-cache tesseract-ocr
COPY --from=backend-builder /app/target/finance-tracker-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
# Set default environment variables
ENV TESSDATA_PATH=/usr/share/tessdata
ENTRYPOINT ["java", "-jar", "app.jar"]
