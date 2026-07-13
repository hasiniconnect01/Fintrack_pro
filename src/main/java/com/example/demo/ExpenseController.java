package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import net.sourceforge.tess4j.TesseractException;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OcrService ocrService;

    @GetMapping
    public List<Expense> getAllExpenses(Authentication authentication) {
        return expenseRepository.findByUser(currentUser(authentication));
    }

    @PostMapping
    public ResponseEntity<?> createExpense(@RequestBody Expense expense, Authentication authentication) {
        expense.setUser(currentUser(authentication));
        Expense savedExpense = expenseRepository.save(expense);
        return ResponseEntity.ok(savedExpense);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExpense(@PathVariable Long id, Authentication authentication) {
        user activeUser = currentUser(authentication);
        return expenseRepository.findById(id)
                .filter(expense -> expense.getUser().getId().equals(activeUser.getId()))
                .map(expense -> {
                    expenseRepository.delete(expense);
                    return ResponseEntity.ok(Map.of("message", "Deleted successfully."));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Expense not found.")));
    }

    @PostMapping("/scan")
    public ResponseEntity<?> scanReceipt(@RequestParam("file") MultipartFile file, Authentication authentication) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Choose a receipt image to scan."));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of("message", "Only receipt image files are supported."));
        }
        try {
            return ResponseEntity.ok(ocrService.processReceipt(file));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", exception.getMessage()));
        } catch (TesseractException | java.io.IOException exception) {
            return ResponseEntity.unprocessableEntity().body(Map.of("message", "We could not read that receipt image. Try a clearer photo."));
        }
    }

    private user currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
