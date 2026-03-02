package com.kailas.polaris.limiter;

import com.kailas.polaris.metrics.RateLimitMetrics;
import com.kailas.polaris.model.ApiKey;
import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.repository.ApiKeyRepository;
import com.kailas.polaris.strategy.RateLimitStrategy;
import com.kailas.polaris.strategy.RateLimitStrategyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RateLimiterManager {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterManager.class);

    private final SlidingWindowRateLimiter slidingWindowRateLimiter;
    private final TokenBucketRateLimiter tokenBucketRateLimiter;
    private final RateLimitStrategyService strategyService;
    private final ApiKeyRepository apiKeyRepository;
    private final RateLimitMetrics rateLimitMetrics;

    public RateLimiterManager(
            SlidingWindowRateLimiter slidingWindowRateLimiter,
            TokenBucketRateLimiter tokenBucketRateLimiter,
            RateLimitStrategyService strategyService,
            ApiKeyRepository apiKeyRepository,
            RateLimitMetrics rateLimitMetrics
    ) {
        this.slidingWindowRateLimiter = slidingWindowRateLimiter;
        this.tokenBucketRateLimiter = tokenBucketRateLimiter;
        this.strategyService = strategyService;
        this.apiKeyRepository = apiKeyRepository;
        this.rateLimitMetrics = rateLimitMetrics;
    }

    public RateLimitDecision check(String apiKeyValue) {
        ApiKey apiKey = apiKeyRepository.findByKeyValue(apiKeyValue)
                .orElseThrow(() -> new IllegalArgumentException("Invalid API key"));

        if (!apiKey.isActive()) {
            RateLimitStrategy strategy = strategyService.getStrategyForPlan(apiKey.getPlanType());
            rateLimitMetrics.incrementUnauthorized(apiKey.getPlanType(), strategy);
            throw new IllegalArgumentException("Inactive API key");
        }

        PlanType planType = apiKey.getPlanType();
        RateLimitStrategy strategy = strategyService.getStrategyForPlan(planType);
        log.debug("Plan: {} | Strategy used: {}", planType, strategy);

        RateLimitDecision decision = executeLimiter(apiKeyValue, strategy);
        if (decision.allowed()) {
            rateLimitMetrics.incrementAllowed(planType, strategy);
        } else {
            rateLimitMetrics.incrementBlocked(planType, strategy);
        }

        return decision;
    }

    private RateLimitDecision executeLimiter(String apiKeyValue, RateLimitStrategy strategy) {
        if (strategy == RateLimitStrategy.TOKEN_BUCKET) {
            return tokenBucketRateLimiter.check(apiKeyValue);
        }
        return slidingWindowRateLimiter.check(apiKeyValue);
    }
}
