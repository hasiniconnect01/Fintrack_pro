package com.example.demo;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final double transactionLimit;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager, SecurityContextRepository securityContextRepository,
                          @Value("${fintrack.transaction-limit}") double transactionLimit) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.transactionLimit = transactionLimit;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalizeEmail(request.email()), request.password()));
            establishSession(authentication, httpRequest, httpResponse);
            return ResponseEntity.ok(toAuthResponse(authentication.getName(), "AUTHENTICATED"));
        } catch (AuthenticationException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Email or password is incorrect."));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest,
                                      HttpServletResponse httpResponse) {
        String email = normalizeEmail(request.email());
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "An account already exists for this email."));
        }

        user newUser = new user();
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(request.password()));
        userRepository.save(newUser);

        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        establishSession(authentication, httpRequest, httpResponse);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toAuthResponse(authentication.getName(), "REGISTERED"));
    }

    @GetMapping("/me")
    public AuthResponse currentUser(Authentication authentication) {
        return toAuthResponse(authentication.getName(), "AUTHENTICATED");
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(Map.of("message", "Signed out."));
    }

    private void establishSession(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthResponse toAuthResponse(String email, String status) {
        user account = userRepository.findByEmail(email)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return new AuthResponse(account.getEmail(), status, account.getMonthlyBudget(), transactionLimit);
    }
}
