package com.kailas.polaris.limiter;

import com.kailas.polaris.model.ApiKey;
import com.kailas.polaris.model.Policy;
import com.kailas.polaris.repository.ApiKeyRepository;
import com.kailas.polaris.repository.PolicyRepository;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FixedWindowRateLimiter implements RateLimiter {

    private final StringRedisTemplate redisTemplate;
    private final ApiKeyRepository apiKeyRepository;
    private final PolicyRepository policyRepository;

    @Override
    public RateLimitDecision check(String apiKeyValue) {
        ApiKey apiKey = apiKeyRepository.findByKeyValue(apiKeyValue)
                .orElseThrow(() -> new IllegalArgumentException("Invalid API key"));
        if (!apiKey.isActive()) {
            throw new IllegalArgumentException("Inactive API key");
        }

        Policy policy = policyRepository.findByPlanType(apiKey.getPlanType())
                .orElseThrow(() -> new IllegalStateException("Policy not configured"));

        long now = System.currentTimeMillis() / 1000;
        long window = policy.getWindowSeconds();
        long windowStart = (now / window) * window;
        String key = "rate_limit:%s:%d".formatted(apiKey.getKeyValue(), windowStart);

        Long count = redisTemplate.opsForValue().increment(key);
        if (count == 1L) {
            redisTemplate.expire(key, Duration.ofSeconds(window));
        }

        if (count > policy.getLimitCount()) {
            long retryAfterSeconds = (windowStart + window) - now;
            return new RateLimitDecision(false, retryAfterSeconds);
        }

        return new RateLimitDecision(true, 0);
    }
}
