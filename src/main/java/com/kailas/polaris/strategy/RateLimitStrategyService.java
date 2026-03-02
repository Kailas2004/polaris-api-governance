package com.kailas.polaris.strategy;

import com.kailas.polaris.model.PlanType;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RateLimitStrategyService {

    private static final String GLOBAL_STRATEGY_KEY = "rate_limit:strategy";
    private static final String PLAN_STRATEGY_PREFIX = "rate_limit:strategy:";

    private final RedisTemplate<String, String> redisTemplate;

    public RateLimitStrategyService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public RateLimitStrategy getStrategy() {
        return parse(redisTemplate.opsForValue().get(GLOBAL_STRATEGY_KEY));
    }

    public void setStrategy(RateLimitStrategy strategy) {
        redisTemplate.opsForValue().set(GLOBAL_STRATEGY_KEY, strategy.name());
    }

    public RateLimitStrategy getStrategyForPlan(PlanType plan) {
        String planKey = planStrategyKey(plan);
        String planValue = redisTemplate.opsForValue().get(planKey);
        if (planValue != null) {
            return parse(planValue);
        }
        return getStrategy();
    }

    public void setStrategyForPlan(PlanType plan, RateLimitStrategy strategy) {
        redisTemplate.opsForValue().set(planStrategyKey(plan), strategy.name());
    }

    private RateLimitStrategy parse(String value) {
        if (value == null) {
            return RateLimitStrategy.SLIDING_WINDOW;
        }
        try {
            return RateLimitStrategy.valueOf(value);
        } catch (IllegalArgumentException ex) {
            return RateLimitStrategy.SLIDING_WINDOW;
        }
    }

    private String planStrategyKey(PlanType plan) {
        return PLAN_STRATEGY_PREFIX + plan.name();
    }
}
