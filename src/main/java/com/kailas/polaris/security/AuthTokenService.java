package com.kailas.polaris.security;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class AuthTokenService {

    private final ConcurrentHashMap<String, TokenSession> sessions = new ConcurrentHashMap<>();
    private final Duration tokenTtl;

    public AuthTokenService(@Value("${polaris.auth.token-ttl-seconds:43200}") long tokenTtlSeconds) {
        this.tokenTtl = Duration.ofSeconds(tokenTtlSeconds);
    }

    public String issueToken(UserDetails userDetails) {
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        Instant expiresAt = Instant.now().plus(tokenTtl);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(value -> value.startsWith("ROLE_") ? value.substring("ROLE_".length()) : value)
                .collect(Collectors.toList());
        sessions.put(token, new TokenSession(userDetails.getUsername(), roles, expiresAt));
        return token;
    }

    public Optional<TokenSession> resolve(String token) {
        TokenSession session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (session.expiresAt().isBefore(Instant.now())) {
            sessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    public void revoke(String token) {
        sessions.remove(token);
    }

    public record TokenSession(String username, List<String> roles, Instant expiresAt) {
    }
}
