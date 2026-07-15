package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> createInvoice(@RequestBody Invoice invoice, Authentication authentication) {
        // Restored to your original lowercase user model mapping
        user activeUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));

        invoice.setUser(activeUser);
        Invoice savedInvoice = invoiceRepository.save(invoice);
        return ResponseEntity.ok(savedInvoice);
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getInvoiceAnalytics(Authentication authentication) {
        // Restored to your original lowercase user model mapping
        user activeUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));

        List<Invoice> userInvoices = invoiceRepository.findByUser(activeUser);

        double totalOwedToUser = userInvoices.stream()
                .filter(i -> !i.isPaid())
                .mapToDouble(Invoice::getTotalAmount)
                .sum();

        long overdueInvoicesCount = userInvoices.stream()
                .filter(i -> !i.isPaid() && i.getDueDate().isBefore(LocalDate.now()))
                .count();

        return ResponseEntity.ok(Map.of(
                "outstandingReceivables", totalOwedToUser,
                "overdueClientAlerts", overdueInvoicesCount,
                "allInvoices", userInvoices
        ));
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<?> markInvoiceAsPaid(@PathVariable Long id, Authentication authentication) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!invoice.getUser().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Unauthorized action."));
        }

        invoice.setPaid(true);
        invoiceRepository.save(invoice);

        return ResponseEntity.ok(Map.of("message", "Invoice successfully cleared and settled!"));
    }
}
