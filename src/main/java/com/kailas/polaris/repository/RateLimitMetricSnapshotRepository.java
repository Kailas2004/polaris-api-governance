package com.kailas.polaris.repository;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.model.RateLimitMetricSnapshot;
import com.kailas.polaris.strategy.RateLimitStrategy;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateLimitMetricSnapshotRepository extends JpaRepository<RateLimitMetricSnapshot, java.util.UUID> {

    Optional<RateLimitMetricSnapshot> findByPlanTypeAndAlgorithm(PlanType planType, RateLimitStrategy algorithm);
}
