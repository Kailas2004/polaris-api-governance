package com.kailas.polaris.metrics;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.strategy.RateLimitStrategy;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class RateLimitMetrics {

    private final MeterRegistry meterRegistry;
    private final PersistentMetricsService persistentMetricsService;

    public RateLimitMetrics(MeterRegistry meterRegistry, PersistentMetricsService persistentMetricsService) {
        this.meterRegistry = meterRegistry;
        this.persistentMetricsService = persistentMetricsService;
    }

    @PostConstruct
    public void initializeCounters() {
        for (String plan : new String[]{"FREE", "PRO"}) {
            for (RateLimitStrategy algorithm : RateLimitStrategy.values()) {
                Counter.builder("rate_limit.allowed")
                        .tag("plan", plan)
                        .tag("algorithm", algorithm.name())
                        .register(meterRegistry);

                Counter.builder("rate_limit.blocked")
                        .tag("plan", plan)
                        .tag("algorithm", algorithm.name())
                        .register(meterRegistry);
            }
        }
    }

    public void incrementAllowed(PlanType plan, RateLimitStrategy algorithm) {
        Counter.builder("rate_limit.allowed")
                .tag("plan", plan.name())
                .tag("algorithm", algorithm.name())
                .register(meterRegistry)
                .increment();
        persistentMetricsService.incrementAllowed(plan, algorithm);
    }

    public void incrementBlocked(PlanType plan, RateLimitStrategy algorithm) {
        Counter.builder("rate_limit.blocked")
                .tag("plan", plan.name())
                .tag("algorithm", algorithm.name())
                .register(meterRegistry)
                .increment();
        persistentMetricsService.incrementBlocked(plan, algorithm);
    }

    public void incrementUnauthorized(PlanType plan, RateLimitStrategy algorithm) {
        persistentMetricsService.incrementUnauthorized(plan, algorithm);
    }

}
