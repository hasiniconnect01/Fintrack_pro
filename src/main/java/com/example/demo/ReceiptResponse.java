package com.example.demo;

public class ReceiptResponse {
    private String merchant;
    private double totalAmount;
    private String date;

    public ReceiptResponse(String merchant, double totalAmount, String date) {
        this.merchant = merchant;
        this.totalAmount = totalAmount;
        this.date = date;
    }

    // Getters and Setters
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
