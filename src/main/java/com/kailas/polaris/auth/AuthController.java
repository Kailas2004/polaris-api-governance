package com.kailas.polaris.auth;

import com.kailas.polaris.security.AuthTokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@Validated
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final AuthTokenService authTokenService;

    public AuthController(AuthenticationManager authenticationManager, AuthTokenService authTokenService) {
        this.authenticationManager = authenticationManager;
        this.authTokenService = authTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            UserDetails user = (UserDetails) authentication.getPrincipal();
            String token = authTokenService.issueToken(user);
            List<String> roles = user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .map(value -> value.startsWith("ROLE_") ? value.substring("ROLE_".length()) : value)
                    .toList();

            String requestedRole = request.role() == null ? "USER" : request.role().trim().toUpperCase();
            if (!requestedRole.equals("ADMIN") && !requestedRole.equals("USER")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role selection"));
            }
            if (!roles.contains(requestedRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Selected role is not permitted for this account"));
            }

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", Map.of(
                            "username", user.getUsername(),
                            "roles", roles,
                            "activeRole", requestedRole
                    )
            ));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));
        }
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(value -> value.startsWith("ROLE_") ? value.substring("ROLE_".length()) : value)
                .toList();
        return Map.of(
                "username", authentication.getName(),
                "roles", roles
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) {
            authTokenService.revoke(authorization.substring("Bearer ".length()).trim());
        }
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password,
            String role
    ) {
    }
}
