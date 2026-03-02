package com.kailas.polaris.admin;

import com.kailas.polaris.metrics.PersistentMetricsService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/metrics")
@RequiredArgsConstructor
public class MetricsController {

    private final PersistentMetricsService persistentMetricsService;

    @GetMapping("/summary")
    public List<PersistentMetricsService.RateLimitMetricRow> summary() {
        return persistentMetricsService.getSummary();
    }
}
