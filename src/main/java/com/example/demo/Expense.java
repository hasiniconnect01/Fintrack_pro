package com.example.demo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "app_expenses")
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title cannot be blank")
    private String title;

    @Positive(message = "Amount must be greater than zero")
    private double amount;

    private String category;
    private LocalDate date;
    private boolean isSubscription;

    // 👤 Connects this single receipt line back to its unique account owner
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore // ✅ CRITICAL FIX: Breaks the infinite JSON loop so data can save and show perfectly!
    private user user;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public boolean isIsSubscription() { return isSubscription; }
    public void setIsSubscription(boolean isSubscription) { this.isSubscription = isSubscription; }

    public user getUser() { return user; }
    public void setUser(user user) { this.user = user; }
}
