package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/message")
    public ResponseEntity<?> handleMessage(@RequestBody Map<String, String> payload, Authentication authentication) {
        user currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));

        String message = payload.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("response", "Please say or type something."));
        }

        String lowerMessage = message.toLowerCase();

        // 1. Extract Amount
        double amount = 0.0;
        // Regex looks for numbers, optionally prefixed/suffixed with currency signs/letters
        Pattern amountPattern = Pattern.compile("(?:\\b|\\$|₹|€|£|usd|inr|eur|gbp)\\s*([0-9]+(?:\\.[0-9]{2})?)\\b", Pattern.CASE_INSENSITIVE);
        Matcher amountMatcher = amountPattern.matcher(lowerMessage);
        
        while (amountMatcher.find()) {
            try {
                double val = Double.parseDouble(amountMatcher.group(1));
                if (val > 0.0) {
                    amount = val;
                    break;
                }
            } catch (NumberFormatException ignored) {}
        }

        // 2. Extract Merchant
        String merchant = null;
        String[] knownMerchants = {"uber", "netflix", "starbucks", "amazon", "apple", "google", "spotify", "steam", "mcdonald", "whole foods", "eat club", "eatclub"};
        for (String m : knownMerchants) {
            if (lowerMessage.contains(m)) {
                merchant = m.equals("eatclub") ? "Eat Club" : m.substring(0, 1).toUpperCase() + m.substring(1);
                if (m.equals("whole foods")) merchant = "Whole Foods";
                if (m.equals("mcdonald")) merchant = "McDonald's";
                break;
            }
        }

        // Fallback: search for words after "spent on", "paid to", "bought", etc.
        if (merchant == null) {
            Pattern spentOnPattern = Pattern.compile("(?:spent on|paid to|bought|bought a|for|at|to)\\s+([a-zA-Z0-9\\s]{3,15})\\b", Pattern.CASE_INSENSITIVE);
            Matcher spentMatcher = spentOnPattern.matcher(lowerMessage);
            if (spentMatcher.find()) {
                String potential = spentMatcher.group(1).trim();
                // Avoid capturing numbers or dates
                if (!potential.matches(".*(?:today|yesterday|tomorrow|[0-9]).*")) {
                    merchant = potential.substring(0, 1).toUpperCase() + potential.substring(1);
                }
            }
        }

        // 3. Extract Date
        LocalDate date = LocalDate.now();
        if (lowerMessage.contains("yesterday")) {
            date = date.minusDays(1);
        } else if (lowerMessage.contains("day before yesterday")) {
            date = date.minusDays(2);
        } else if (lowerMessage.contains("last week")) {
            date = date.minusWeeks(1);
        }

        // 4. If we got amount and merchant, record it!
        if (amount > 0.0 && merchant != null && !merchant.isBlank()) {
            // Convert to base USD for database consistency
            double rate = 1.0;
            String currencySymbol = "$";
            if (lowerMessage.contains("inr") || lowerMessage.contains("₹") || lowerMessage.contains("rupee")) {
                rate = 83.5;
                currencySymbol = "₹";
            } else if (lowerMessage.contains("eur") || lowerMessage.contains("€") || lowerMessage.contains("euro")) {
                rate = 0.92;
                currencySymbol = "€";
            } else if (lowerMessage.contains("gbp") || lowerMessage.contains("£") || lowerMessage.contains("pound")) {
                rate = 0.79;
                currencySymbol = "£";
            }

            double baseAmount = amount / rate;

            Expense expense = new Expense();
            expense.setTitle(merchant);
            expense.setAmount(baseAmount);
            expense.setDate(date);

            // Categorization
            String category = "Other";
            String merchantLower = merchant.toLowerCase();
            if (merchantLower.contains("uber") || merchantLower.contains("taxi") || merchantLower.contains("ride")) {
                category = "Transportation";
            } else if (merchantLower.contains("netflix") || merchantLower.contains("spotify") || merchantLower.contains("steam")) {
                category = "Entertainment";
            } else if (merchantLower.contains("starbucks") || merchantLower.contains("mcdonald") || merchantLower.contains("food") || merchantLower.contains("coffee")) {
                category = "Food";
            } else if (merchantLower.contains("amazon") || merchantLower.contains("apple") || merchantLower.contains("google")) {
                category = "Shopping";
            }
            expense.setCategory(category);
            expense.setUser(currentUser);
            expense.setIsSubscription(merchantLower.contains("netflix") || merchantLower.contains("spotify"));
            expense.setReceiptSource("AI Chatbot");
            expense.setReceiptStatus("RECORDED");

            expenseRepository.save(expense);

            String responseMsg = "✨ Transaction recorded successfully! I logged **" + merchant 
                    + "** for **" + currencySymbol + String.format("%.2f", amount) 
                    + "** on **" + date.toString() + "** under **" + category + "**.";
            
            return ResponseEntity.ok(Map.of(
                "response", responseMsg,
                "recorded", true
            ));
        }

        // Conversational Fallbacks
        String fallbackResponse = "I heard you, but I couldn't extract the merchant or amount. "
                + "Try formatting it like: *'Spent 450 INR on Starbucks today'* or *'Paid 19.99 USD for Netflix yesterday'* so I can record it!";
        
        if (lowerMessage.contains("hello") || lowerMessage.contains("hi") || lowerMessage.contains("hey")) {
            fallbackResponse = "👋 Hello! I am your FinTrack Pro AI Assistant. Type or speak a purchase (e.g. *'I spent 25 dollars on Uber today'*) and I will record it instantly!";
        } else if (lowerMessage.contains("thank you") || lowerMessage.contains("thanks")) {
            fallbackResponse = "You're welcome! Let me know if you have any other transactions to log.";
        }

        return ResponseEntity.ok(Map.of(
            "response", fallbackResponse,
            "recorded", false
        ));
    }
}
