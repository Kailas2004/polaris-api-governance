package com.kailas.polaris.repository;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.model.Policy;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    Optional<Policy> findByPlanType(PlanType planType);
}
