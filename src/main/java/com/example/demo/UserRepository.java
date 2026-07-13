package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<user, Long> {
    // 🔍 Looks up if a specific email account handle is already registered
    Optional<user> findByEmail(String email);
}
