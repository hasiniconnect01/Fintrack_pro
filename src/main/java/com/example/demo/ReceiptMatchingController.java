package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import net.sourceforge.tess4j.TesseractException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/receipt-matching")
public class ReceiptMatchingController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ImapSyncService imapSyncService;

    @Autowired
    private OcrService ocrService;

    @PostMapping("/save-imap")
    public ResponseEntity<?> saveImapSettings(@RequestBody Map<String, Object> payload, Authentication authentication) {
        user currentUser = currentUser(authentication);
        
        String host = payload.getOrDefault("imapHost", "").toString();
        int port = Integer.parseInt(payload.getOrDefault("imapPort", "993").toString());
        String username = payload.getOrDefault("imapUsername", "").toString();
        String password = payload.getOrDefault("imapPassword", "").toString();

        if (host.isBlank() || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "IMAP Host, Username, and Password are required."));
        }

        currentUser.setImapHost(host);
        currentUser.setImapPort(port);
        currentUser.setImapUsername(username);
        currentUser.setImapPassword(password);
        userRepository.save(currentUser);

        return ResponseEntity.ok(Map.of("message", "IMAP credentials updated successfully."));
    }

    @GetMapping("/scanned-receipts")
    public ResponseEntity<?> getScannedReceipts(Authentication authentication) {
        user currentUser = currentUser(authentication);
        List<Expense> expenses = expenseRepository.findByUser(currentUser);
        List<ScannedReceipt> scannedReceipts = new ArrayList<>();

        boolean isImapConfigured = currentUser.getImapHost() != null && !currentUser.getImapHost().isBlank();

        if (isImapConfigured) {
            try {
                scannedReceipts = imapSyncService.fetchReceiptsFromEmail(
                        currentUser.getImapHost(),
                        currentUser.getImapPort(),
                        currentUser.getImapUsername(),
                        currentUser.getImapPassword()
                );
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of("message", "Failed to sync with IMAP server: " + e.getMessage()));
            }
        } else {
            // Fallback: If no IMAP is configured, return mock receipts but label them as DEMO mode so it's clear
            LocalDate today = LocalDate.now();
            scannedReceipts.add(new ScannedReceipt("demo-uber-1", "Uber Trip (Demo)", 15.50, today.minusDays(1).toString(), "EMAIL", "Demo: Uber Ride Receipt #8293"));
            scannedReceipts.add(new ScannedReceipt("demo-netflix-2", "Netflix (Demo)", 19.99, today.minusDays(3).toString(), "EMAIL", "Demo: Netflix Invoice #Subscription"));
            scannedReceipts.add(new ScannedReceipt("demo-starbucks-3", "Starbucks (Demo)", 6.75, today.toString(), "EMAIL", "Demo: Starbucks Receipt #Coffee"));
        }

        // Apply matching engine to scanned receipts
        runMatchingEngine(scannedReceipts, expenses);

        Map<String, Object> response = new HashMap<>();
        response.put("receipts", scannedReceipts);
        response.put("imapConfigured", isImapConfigured);
        if (isImapConfigured) {
            response.put("imapUsername", currentUser.getImapUsername());
            response.put("imapHost", currentUser.getImapHost());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload-gallery")
    public ResponseEntity<?> uploadGalleryReceipts(@RequestParam("files") MultipartFile[] files, Authentication authentication) {
        user currentUser = currentUser(authentication);
        List<Expense> expenses = expenseRepository.findByUser(currentUser);
        List<ScannedReceipt> uploadedReceipts = new ArrayList<>();

        for (int i = 0; i < files.length; i++) {
            MultipartFile file = files[i];
            if (file.isEmpty()) continue;

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) continue;

            try {
                // Perform REAL OCR via Tess4J
                ReceiptResponse ocrResponse = ocrService.processReceipt(file);
                
                String id = "gallery-real-" + System.currentTimeMillis() + "-" + i;
                String merchant = ocrResponse.getMerchant();
                double amount = ocrResponse.getTotalAmount();
                String date = ocrResponse.getDate();
                String sourceName = "Gallery: " + file.getOriginalFilename();

                ScannedReceipt receipt = new ScannedReceipt(id, merchant, amount, date, "GALLERY", sourceName);
                uploadedReceipts.add(receipt);
            } catch (TesseractException | java.io.IOException e) {
                // Return descriptive error for OCR failure
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of("message", "OCR processing failed for file: " + file.getOriginalFilename() + ". " + e.getMessage()));
            }
        }

        // Match uploaded receipts
        runMatchingEngine(uploadedReceipts, expenses);

        return ResponseEntity.ok(uploadedReceipts);
    }

    @PostMapping("/link")
    public ResponseEntity<?> linkReceiptToExpense(@RequestBody Map<String, Object> payload, Authentication authentication) {
        user currentUser = currentUser(authentication);
        
        Long expenseId = Long.parseLong(payload.get("expenseId").toString());
        String receiptSource = payload.get("receiptSource").toString();
        String receiptStatus = payload.getOrDefault("receiptStatus", "MATCHED").toString();

        Optional<Expense> optionalExpense = expenseRepository.findById(expenseId);
        if (optionalExpense.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Expense not found."));
        }

        Expense expense = optionalExpense.get();
        if (!expense.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Unauthorized access."));
        }

        expense.setReceiptSource(receiptSource);
        expense.setReceiptStatus(receiptStatus);
        expenseRepository.save(expense);

        return ResponseEntity.ok(Map.of("message", "Receipt linked successfully.", "expense", expense));
    }

    @PostMapping("/create-and-link")
    public ResponseEntity<?> createAndLinkExpense(@RequestBody Map<String, Object> payload, Authentication authentication) {
        user currentUser = currentUser(authentication);

        String title = payload.get("title").toString();
        double amount = Double.parseDouble(payload.get("amount").toString());
        String category = payload.get("category").toString();
        LocalDate date = LocalDate.parse(payload.get("date").toString());
        String receiptSource = payload.get("receiptSource").toString();

        Expense expense = new Expense();
        expense.setTitle(title);
        expense.setAmount(amount);
        expense.setCategory(category);
        expense.setDate(date);
        expense.setUser(currentUser);
        expense.setReceiptSource(receiptSource);
        expense.setReceiptStatus("MATCHED");

        Expense savedExpense = expenseRepository.save(expense);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);
    }

    private void runMatchingEngine(List<ScannedReceipt> receipts, List<Expense> expenses) {
        for (ScannedReceipt receipt : receipts) {
            Expense bestMatch = null;
            String bestStatus = "NONE";

            for (Expense exp : expenses) {
                if (Math.abs(exp.getAmount() - receipt.getAmount()) < 0.01) {
                    LocalDate expDate = exp.getDate();
                    LocalDate receiptDate = LocalDate.parse(receipt.getDate());
                    long dateDiff = Math.abs(ChronoUnit.DAYS.between(expDate, receiptDate));

                    boolean nameSimilarity = exp.getTitle().toLowerCase().contains(receipt.getMerchant().toLowerCase()) ||
                            receipt.getMerchant().toLowerCase().contains(exp.getTitle().toLowerCase());

                    if (dateDiff <= 1 && nameSimilarity) {
                        bestMatch = exp;
                        bestStatus = "EXACT";
                        break;
                    } else if (dateDiff <= 3) {
                        bestMatch = exp;
                        bestStatus = "PARTIAL";
                    } else if (nameSimilarity) {
                        if (bestMatch == null || !bestStatus.equals("PARTIAL")) {
                            bestMatch = exp;
                            bestStatus = "PARTIAL";
                        }
                    }
                }
            }

            if (bestMatch != null) {
                receipt.setMatchStatus(bestStatus);
                receipt.setMatchedExpenseId(bestMatch.getId());
                receipt.setMatchedExpenseTitle(bestMatch.getTitle());
            }
        }
    }

    private user currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
