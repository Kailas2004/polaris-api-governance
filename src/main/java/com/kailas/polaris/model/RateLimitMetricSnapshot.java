package com.kailas.polaris.model;

import com.kailas.polaris.strategy.RateLimitStrategy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "rate_limit_metric_snapshots",
        uniqueConstraints = @UniqueConstraint(columnNames = {"planType", "algorithm"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class RateLimitMetricSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanType planType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RateLimitStrategy algorithm;

    @Column(nullable = false)
    private long allowedCount;

    @Column(nullable = false)
    private long blockedCount;

    @Column(nullable = true)
    private Long unauthorizedCount;
}
