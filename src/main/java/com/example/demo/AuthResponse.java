package com.example.demo;

public record AuthResponse(String email, String status, double monthlyBudget, double transactionLimit) {
}
