package com.kailas.polaris.config;

import com.kailas.polaris.limiter.FixedWindowRateLimiter;
import com.kailas.polaris.limiter.RateLimiter;
import com.kailas.polaris.limiter.SlidingWindowRateLimiter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimiterConfig {

    @Bean
    public RateLimiter rateLimiter(
            @Value("${rate.limiter.type}") String type,
            FixedWindowRateLimiter fixed,
            SlidingWindowRateLimiter sliding
    ) {
        if ("fixed".equalsIgnoreCase(type)) {
            return fixed;
        }
        return sliding;
    }
}
