package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    // 🔍 This strict custom finder is what filters data rows by your user profile account
    List<Expense> findByUser(user user);
}
