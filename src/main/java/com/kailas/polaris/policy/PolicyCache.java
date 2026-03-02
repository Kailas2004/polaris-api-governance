package com.kailas.polaris.policy;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.model.Policy;
import com.kailas.polaris.repository.PolicyRepository;
import jakarta.annotation.PostConstruct;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PolicyCache {

    private final PolicyRepository policyRepository;
    private final ConcurrentHashMap<PlanType, Policy> cache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    @EventListener(ContextRefreshedEvent.class)
    public void onContextRefreshed(ContextRefreshedEvent ignored) {
        refreshCache();
    }

    private void refreshCache() {
        cache.clear();
        policyRepository.findAll().forEach(policy -> cache.put(policy.getPlanType(), policy));
    }

    public void refresh() {
        refreshCache();
    }

    public Policy getPolicy(PlanType planType) {
        Policy policy = cache.get(planType);
        if (policy == null) {
            throw new IllegalStateException("Policy not configured for plan: " + planType);
        }
        return policy;
    }
}
