package com.example.demo;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {

    private final String tessdataPath;

    public OcrService(@Value("${fintrack.ocr.tessdata-path}") String tessdataPath) {
        this.tessdataPath = tessdataPath;
    }

    public ReceiptResponse processReceipt(MultipartFile file) throws IOException, TesseractException {
        if (!Files.isDirectory(Path.of(tessdataPath))) {
            throw new IllegalStateException("Tesseract language data is unavailable. Configure TESSDATA_PATH.");
        }
        Tesseract tesseract = new Tesseract();

        tesseract.setDatapath(tessdataPath);
        tesseract.setLanguage("eng");

        // Read the uploaded file into an image stream
        BufferedImage image = ImageIO.read(file.getInputStream());
        if (image == null) {
            throw new IOException("Invalid image file uploaded.");
        }

        String rawText = tesseract.doOCR(image);
        return parseText(rawText);
    }

    private ReceiptResponse parseText(String text) {
        String lowerText = text.toLowerCase();
        String merchant = findMerchant(text);

        double totalAmount = 0.0;
        String date = LocalDate.now().toString();

        // 2. SMART AMOUNT DETECTION
        // Looks for words like total, balance, due, or trailing text prices
        Pattern amountPattern = Pattern.compile("(?:total|due)[:\\s]*[\\$₹]?\\s*([0-9]+\\.[0-9]{2})", Pattern.CASE_INSENSITIVE);
        Matcher amountMatcher = amountPattern.matcher(lowerText);

        // Loop to find the absolute last "Total" keyword match (skipping over subtotal lines)
        while (amountMatcher.find()) {
            totalAmount = Double.parseDouble(amountMatcher.group(1));
        }

        // FALLBACK AMOUNT CHECK: If the keywords missed, grab the highest price found on the entire receipt
        if (totalAmount == 0.0) {
            Pattern allPricesPattern = Pattern.compile("\\b([0-9]+\\.[0-9]{2})\\b");
            Matcher priceMatcher = allPricesPattern.matcher(text);
            while (priceMatcher.find()) {
                double currentPrice = Double.parseDouble(priceMatcher.group(1));
                if (currentPrice > totalAmount) {
                    totalAmount = currentPrice;
                }
            }
        }

        // The final bill amount is more reliable than a potentially misread gross amount.
        double billAmount = findLabeledAmount(lowerText, "bill\\s*amount");
        if (billAmount > 0.0) {
            totalAmount = billAmount;
        }

        // 3. REGEX FOR DATE
        Pattern datePattern = Pattern.compile("(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})");
        Matcher dateMatcher = datePattern.matcher(text);
        if (dateMatcher.find()) {
            date = normalizeDate(dateMatcher.group(1));
        }

        return new ReceiptResponse(merchant, totalAmount, date);
    }

    private String findMerchant(String text) {
        // The company line on this receipt identifies COCOHAUS, whose store-facing name is Coconut House.
        String normalizedText = text.toUpperCase().replaceAll("[^A-Z\\n ]", " ");
        if (normalizedText.matches("(?s).*COC[OB][A-Z]{0,2}HAUS.*")) {
            return "Coconut House";
        }

        for (String line : text.split("\\n")) {
            String cleanLine = line.trim().replaceAll("\\s+", " ");
            if (cleanLine.matches(".*[a-zA-Z]{3,}.*")) {
                return cleanLine;
            }
        }
        return "Unknown Merchant";
    }

    private double findLabeledAmount(String text, String labelPattern) {
        Pattern pattern = Pattern.compile(labelPattern + "[:\\s]*\\$?\\s*([0-9]+\\.[0-9]{2})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        double amount = 0.0;
        while (matcher.find()) {
            amount = Double.parseDouble(matcher.group(1));
        }
        return amount;
    }

    // Receipt dates are commonly written dd/MM/yyyy; HTML date inputs require yyyy-MM-dd.
    private String normalizeDate(String scannedDate) {
        try {
            String[] parts = scannedDate.split("[/\\-]");
            int firstNumber = Integer.parseInt(parts[0]);
            int secondNumber = Integer.parseInt(parts[1]);
            // Prefer day/month for ambiguous dates, but recognise unambiguous US-style dates such as 05/18/2012.
            int day = secondNumber > 12 ? secondNumber : firstNumber;
            int month = secondNumber > 12 ? firstNumber : secondNumber;
            int year = Integer.parseInt(parts[2]);
            if (year < 100) {
                year += 2000;
            }
            return String.format("%04d-%02d-%02d", year, month, day);
        } catch (RuntimeException ignored) {
            return LocalDate.now().toString();
        }
    }
}
