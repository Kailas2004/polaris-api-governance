package com.kailas.polaris.metrics;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.model.RateLimitMetricSnapshot;
import com.kailas.polaris.repository.RateLimitMetricSnapshotRepository;
import com.kailas.polaris.strategy.RateLimitStrategy;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PersistentMetricsService {

    private final RateLimitMetricSnapshotRepository snapshotRepository;

    @PostConstruct
    @Transactional
    public void initializeRows() {
        for (PlanType planType : PlanType.values()) {
            for (RateLimitStrategy algorithm : RateLimitStrategy.values()) {
                snapshotRepository.findByPlanTypeAndAlgorithm(planType, algorithm)
                        .orElseGet(() -> snapshotRepository.save(
                                RateLimitMetricSnapshot.builder()
                                        .planType(planType)
                                        .algorithm(algorithm)
                                        .allowedCount(0L)
                                        .blockedCount(0L)
                                        .unauthorizedCount(0L)
                                        .build()
                        ));
            }
        }
    }

    @Transactional
    public void incrementAllowed(PlanType planType, RateLimitStrategy algorithm) {
        RateLimitMetricSnapshot snapshot = getOrCreateSnapshot(planType, algorithm);
        snapshot.setAllowedCount(snapshot.getAllowedCount() + 1);
        snapshotRepository.save(snapshot);
    }

    @Transactional
    public void incrementBlocked(PlanType planType, RateLimitStrategy algorithm) {
        RateLimitMetricSnapshot snapshot = getOrCreateSnapshot(planType, algorithm);
        snapshot.setBlockedCount(snapshot.getBlockedCount() + 1);
        snapshotRepository.save(snapshot);
    }

    @Transactional
    public void incrementUnauthorized(PlanType planType, RateLimitStrategy algorithm) {
        RateLimitMetricSnapshot snapshot = getOrCreateSnapshot(planType, algorithm);
        snapshot.setUnauthorizedCount(getUnauthorizedCount(snapshot) + 1);
        snapshotRepository.save(snapshot);
    }

    @Transactional(readOnly = true)
    public List<RateLimitMetricRow> getSummary() {
        List<RateLimitMetricRow> rows = new ArrayList<>();

        for (PlanType planType : PlanType.values()) {
            for (RateLimitStrategy algorithm : RateLimitStrategy.values()) {
                RateLimitMetricSnapshot snapshot = snapshotRepository
                        .findByPlanTypeAndAlgorithm(planType, algorithm)
                        .orElseGet(() -> RateLimitMetricSnapshot.builder()
                                .planType(planType)
                                .algorithm(algorithm)
                                .allowedCount(0L)
                                .blockedCount(0L)
                                .unauthorizedCount(0L)
                                .build());

                long unauthorized = getUnauthorizedCount(snapshot);
                long total = snapshot.getAllowedCount() + snapshot.getBlockedCount() + unauthorized;
                rows.add(new RateLimitMetricRow(
                        snapshot.getPlanType().name(),
                        snapshot.getAlgorithm().name(),
                        snapshot.getAllowedCount(),
                        snapshot.getBlockedCount(),
                        unauthorized,
                        total
                ));
            }
        }

        rows.sort(Comparator.comparing(RateLimitMetricRow::plan).thenComparing(RateLimitMetricRow::algorithm));
        return rows;
    }

    private RateLimitMetricSnapshot getOrCreateSnapshot(PlanType planType, RateLimitStrategy algorithm) {
        return snapshotRepository.findByPlanTypeAndAlgorithm(planType, algorithm)
                .orElseGet(() -> RateLimitMetricSnapshot.builder()
                        .planType(planType)
                        .algorithm(algorithm)
                        .allowedCount(0L)
                        .blockedCount(0L)
                        .unauthorizedCount(0L)
                        .build());
    }

    private long getUnauthorizedCount(RateLimitMetricSnapshot snapshot) {
        return snapshot.getUnauthorizedCount() == null ? 0L : snapshot.getUnauthorizedCount();
    }

    public record RateLimitMetricRow(
            String plan,
            String algorithm,
            long allowed,
            long blocked,
            long unauthorized,
            long total
    ) {
    }
}
