package com.kailas.polaris.admin;

import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.strategy.RateLimitStrategy;
import com.kailas.polaris.strategy.RateLimitStrategyService;
import com.kailas.polaris.service.AdminAuditLogService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/strategy")
@RequiredArgsConstructor
public class StrategyController {

    private final RateLimitStrategyService strategyService;
    private final AdminAuditLogService adminAuditLogService;

    @GetMapping
    public RateLimitStrategy currentStrategy() {
        return strategyService.getStrategy();
    }

    @PostMapping
    public String switchStrategy(
            @RequestParam("strategy") RateLimitStrategy strategy,
            @RequestParam(value = "plan", required = false) PlanType plan
    ) {
        if (plan != null) {
            RateLimitStrategy before = strategyService.getStrategyForPlan(plan);
            strategyService.setStrategyForPlan(plan, strategy);
            adminAuditLogService.log(
                    "STRATEGY_UPDATE",
                    "PLAN_STRATEGY",
                    plan.name(),
                    "Changed " + plan + " strategy from " + before + " to " + strategy
            );
            return "Strategy for plan " + plan + " switched to " + strategy;
        }

        RateLimitStrategy before = strategyService.getStrategy();
        strategyService.setStrategy(strategy);
        adminAuditLogService.log(
                "STRATEGY_UPDATE",
                "GLOBAL_STRATEGY",
                "GLOBAL",
                "Changed global strategy from " + before + " to " + strategy
        );
        return "Global strategy switched to " + strategy;
    }

    @GetMapping("/debug")
    public Map<String, String> debugStrategies() {
        return Map.of(
                "global", strategyService.getStrategy().name(),
                "FREE", strategyService.getStrategyForPlan(PlanType.FREE).name(),
                "PRO", strategyService.getStrategyForPlan(PlanType.PRO).name()
        );
    }

    @GetMapping("/details")
    public Map<String, String> details() {
        return Map.of("active", currentStrategy().name());
    }
}
