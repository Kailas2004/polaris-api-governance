package com.kailas.polaris.limiter;

public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {
}
