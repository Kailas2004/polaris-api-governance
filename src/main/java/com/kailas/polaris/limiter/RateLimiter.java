package com.kailas.polaris.limiter;

public interface RateLimiter {

    /**
     * Applies rate-limiting decision for the provided API key value.
     *
     * @throws IllegalArgumentException if the API key is not found or inactive
     */
    RateLimitDecision check(String apiKeyValue);
}
