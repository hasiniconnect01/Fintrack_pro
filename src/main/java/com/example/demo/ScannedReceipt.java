package com.example.demo;

public class ScannedReceipt {
    private String id;
    private String merchant;
    private double amount;
    private String date;
    private String source; // "EMAIL" or "GALLERY"
    private String sourceName; // e.g. "Email: Uber Receipt #2847" or "Gallery: IMG_8294.PNG"
    private String matchStatus; // "EXACT", "PARTIAL", "NONE"
    private Long matchedExpenseId;
    private String matchedExpenseTitle;

    public ScannedReceipt() {}

    public ScannedReceipt(String id, String merchant, double amount, String date, String source, String sourceName) {
        this.id = id;
        this.merchant = merchant;
        this.amount = amount;
        this.date = date;
        this.source = source;
        this.sourceName = sourceName;
        this.matchStatus = "NONE";
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getMatchStatus() { return matchStatus; }
    public void setMatchStatus(String matchStatus) { this.matchStatus = matchStatus; }

    public Long getMatchedExpenseId() { return matchedExpenseId; }
    public void setMatchedExpenseId(Long matchedExpenseId) { this.matchedExpenseId = matchedExpenseId; }

    public String getMatchedExpenseTitle() { return matchedExpenseTitle; }
    public void setMatchedExpenseTitle(String matchedExpenseTitle) { this.matchedExpenseTitle = matchedExpenseTitle; }
}
