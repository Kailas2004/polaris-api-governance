package com.kailas.polaris.policy;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.model.Policy;
import com.kailas.polaris.policy.PolicyCache;
import com.kailas.polaris.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PolicyInitializer implements ApplicationRunner {

    private static final int WINDOW_SECONDS = 60;

    private final PolicyRepository policyRepository;
    private final PolicyCache policyCache;

    @Override
    public void run(ApplicationArguments args) {
        createPolicyIfMissing(PlanType.FREE, 100, WINDOW_SECONDS);
        createPolicyIfMissing(PlanType.PRO, 1000, WINDOW_SECONDS);
        policyCache.refresh();
    }

    private void createPolicyIfMissing(PlanType planType, int limitCount, int windowSeconds) {
        if (policyRepository.findByPlanType(planType).isPresent()) {
            return;
        }

        Policy policy = Policy.builder()
                .planType(planType)
                .limitCount(limitCount)
                .windowSeconds(windowSeconds)
                .build();

        policyRepository.save(policy);
    }
}
