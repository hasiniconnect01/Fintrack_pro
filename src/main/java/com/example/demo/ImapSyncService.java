package com.example.demo;

import jakarta.mail.*;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.search.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ImapSyncService {

    @org.springframework.beans.factory.annotation.Autowired
    private OcrService ocrService;

    public List<ScannedReceipt> fetchReceiptsFromEmail(String host, int port, String username, String password) throws Exception {
        List<ScannedReceipt> receipts = new ArrayList<>();

        Properties properties = new Properties();
        properties.put("mail.store.protocol", "imaps");
        properties.put("mail.imaps.host", host);
        properties.put("mail.imaps.port", String.valueOf(port));
        properties.put("mail.imaps.ssl.enable", "true");
        properties.put("mail.imaps.ssl.trust", "*");

        Session emailSession = Session.getInstance(properties);
        Store store = emailSession.getStore("imaps");
        
        try {
            store.connect(host, username, password);
        } catch (AuthenticationFailedException e) {
            throw new IllegalArgumentException("IMAP Authentication failed. Check your email credentials or App Password.");
        } catch (MessagingException e) {
            throw new IOException("Failed to connect to IMAP server " + host + ":" + port + ". " + e.getMessage());
        }

        Folder inbox = store.getFolder("INBOX");
        inbox.open(Folder.READ_ONLY);

        // Search for relevant transaction emails
        SearchTerm[] terms = new SearchTerm[] {
            new SubjectTerm("receipt"),
            new SubjectTerm("invoice"),
            new SubjectTerm("order"),
            new SubjectTerm("payment"),
            new SubjectTerm("uber"),
            new SubjectTerm("netflix"),
            new SubjectTerm("starbucks"),
            new SubjectTerm("eat club"),
            new SubjectTerm("eatclub")
        };
        SearchTerm searchOr = new OrTerm(terms);

        Message[] messages = inbox.search(searchOr);
        
        // Sort messages to get the newest first
        Arrays.sort(messages, (m1, m2) -> {
            try {
                Date d1 = m1.getSentDate();
                Date d2 = m2.getSentDate();
                if (d1 == null) return 1;
                if (d2 == null) return -1;
                return d2.compareTo(d1);
            } catch (MessagingException e) {
                return 0;
            }
        });

        int count = Math.min(messages.length, 15);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (int i = 0; i < count; i++) {
            Message msg = messages[i];
            String subject = msg.getSubject();
            Date sentDate = msg.getSentDate();
            String dateStr = sentDate != null 
                ? sentDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().format(formatter) 
                : java.time.LocalDate.now().toString();

            String bodyText = getEmailBody(msg);
            List<String> attachmentTexts = new ArrayList<>();
            try {
                processAttachments(msg, attachmentTexts);
            } catch (Exception e) {
                System.err.println("Error processing attachments: " + e.getMessage());
            }

            StringBuilder fullTextBuilder = new StringBuilder();
            fullTextBuilder.append(subject).append("\n");
            if (msg.getFrom() != null && msg.getFrom().length > 0) {
                fullTextBuilder.append(msg.getFrom()[0].toString()).append("\n");
            }
            fullTextBuilder.append(bodyText);
            for (String attText : attachmentTexts) {
                fullTextBuilder.append("\n").append(attText);
            }
            String fullText = fullTextBuilder.toString();

            String merchant = parseMerchantFromFullText(fullText, msg.getFrom(), subject);
            double amount = parseAmount(fullText);

            String id = "email-real-" + msg.getMessageNumber() + "-" + (sentDate != null ? sentDate.getTime() : System.currentTimeMillis());
            String sourceName = "Email: " + subject;
            receipts.add(new ScannedReceipt(id, merchant, amount, dateStr, "EMAIL", sourceName));
        }

        inbox.close(false);
        store.close();

        return receipts;
    }

    private String parseMerchantFromFullText(String fullText, Address[] fromAddresses, String subject) {
        String combined = fullText.toLowerCase();

        if (combined.contains("uber")) return "Uber";
        if (combined.contains("netflix")) return "Netflix";
        if (combined.contains("starbucks")) return "Starbucks";
        if (combined.contains("amazon")) return "Amazon";
        if (combined.contains("apple")) return "Apple";
        if (combined.contains("google")) return "Google";
        if (combined.contains("spotify")) return "Spotify";
        if (combined.contains("steam")) return "Steam";
        if (combined.contains("mcdonald")) return "McDonald's";
        if (combined.contains("whole foods")) return "Whole Foods";
        if (combined.contains("eat club") || combined.contains("eatclub")) return "Eat Club";
        
        if (fromAddresses != null && fromAddresses.length > 0) {
            String from = fromAddresses[0].toString();
            int angleBracket = from.indexOf('<');
            if (angleBracket > 0) {
                return from.substring(0, angleBracket).trim().replace("\"", "");
            }
            return from;
        }
        return "Unknown Merchant";
    }

    private void processAttachments(Part part, List<String> extractedTexts) throws MessagingException, IOException {
        if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            int count = multipart.getCount();
            for (int i = 0; i < count; i++) {
                processAttachments(multipart.getBodyPart(i), extractedTexts);
            }
        } else {
            String fileName = part.getFileName();
            if (fileName != null && !fileName.trim().isEmpty()) {
                String contentType = part.getContentType().toLowerCase();
                if (contentType.contains("image/") || fileName.toLowerCase().endsWith(".png") 
                        || fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) {
                    try (java.io.InputStream is = part.getInputStream()) {
                        ReceiptResponse response = ocrService.processReceipt(is);
                        if (response != null) {
                            String text = "Attachment OCR Merchant: " + response.getMerchant() 
                                    + " Amount: " + response.getTotalAmount() 
                                    + " Date: " + response.getDate();
                            extractedTexts.add(text);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to OCR attachment " + fileName + ": " + e.getMessage());
                    }
                } else if (contentType.contains("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
                    try (java.io.InputStream is = part.getInputStream();
                         org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.pdmodel.PDDocument.load(is)) {
                        org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                        String pdfText = stripper.getText(document);
                        extractedTexts.add("Attachment PDF text: " + pdfText);
                    } catch (Exception e) {
                        System.err.println("Failed to parse PDF attachment " + fileName + ": " + e.getMessage());
                    }
                }
            }
        }
    }

    private double parseAmount(String text) {
        Pattern amountPattern = Pattern.compile("(?:total|due|charge|amount|bill)[:\\s]*[\\$₹€£]?\\s*([0-9,]+\\.[0-9]{2})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = amountPattern.matcher(text);
        
        double amount = 0.0;
        while (matcher.find()) {
            try {
                String valStr = matcher.group(1).replace(",", "");
                amount = Double.parseDouble(valStr);
            } catch (NumberFormatException ignored) {}
        }
        
        if (amount == 0.0) {
            Pattern fallbackPattern = Pattern.compile("(?:\\$|₹|€|£|USD|EUR|GBP|INR)\\s*([0-9,]+\\.[0-9]{2})");
            Matcher fallbackMatcher = fallbackPattern.matcher(text);
            while (fallbackMatcher.find()) {
                try {
                    String valStr = fallbackMatcher.group(1).replace(",", "");
                    double val = Double.parseDouble(valStr);
                    if (val > amount) {
                        amount = val;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        return amount;
    }

    private String getEmailBody(Message message) throws MessagingException, IOException {
        if (message.isMimeType("text/plain")) {
            return message.getContent().toString();
        } else if (message.isMimeType("text/html")) {
            return stripHtml(message.getContent().toString());
        } else if (message.isMimeType("multipart/*")) {
            MimeMultipart mimeMultipart = (MimeMultipart) message.getContent();
            return getTextFromMimeMultipart(mimeMultipart);
        }
        return "";
    }

    private String getTextFromMimeMultipart(MimeMultipart mimeMultipart) throws MessagingException, IOException {
        StringBuilder result = new StringBuilder();
        int count = mimeMultipart.getCount();
        for (int i = 0; i < count; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);
            if (bodyPart.isMimeType("text/plain")) {
                result.append(bodyPart.getContent().toString());
            } else if (bodyPart.isMimeType("text/html")) {
                result.append(stripHtml(bodyPart.getContent().toString()));
            } else if (bodyPart.getContent() instanceof MimeMultipart) {
                result.append(getTextFromMimeMultipart((MimeMultipart) bodyPart.getContent()));
            }
        }
        return result.toString();
    }

    private String stripHtml(String html) {
        return html.replaceAll("<[^>]*>", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
    }
}
