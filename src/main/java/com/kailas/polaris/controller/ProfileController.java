package com.kailas.polaris.controller;

import com.kailas.polaris.model.ApiKey;
import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.repository.ApiKeyRepository;
import com.kailas.polaris.strategy.RateLimitStrategy;
import com.kailas.polaris.strategy.RateLimitStrategyService;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final RateLimitStrategyService strategyService;
    private final ApiKeyRepository apiKeyRepository;

    @GetMapping("/admin")
    public Map<String, Object> adminProfile() {
        return Map.of(
                "globalStrategy", strategyService.getStrategy().name(),
                "freePlanStrategy", strategyService.getStrategyForPlan(PlanType.FREE).name(),
                "proPlanStrategy", strategyService.getStrategyForPlan(PlanType.PRO).name()
        );
    }

    @GetMapping("/user")
    public ResponseEntity<Object> userProfile(@RequestHeader("X-API-KEY") String keyValue) {
        Optional<ApiKey> apiKeyOptional = apiKeyRepository.findByKeyValue(keyValue);
        if (apiKeyOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid API key"));
        }

        ApiKey apiKey = apiKeyOptional.get();
        Map<String, Object> payload = Map.of(
                "id", apiKey.getId(),
                "planType", apiKey.getPlanType(),
                "active", apiKey.isActive(),
                "createdAt", apiKey.getCreatedAt(),
                "currentStrategy", strategyService.getStrategyForPlan(apiKey.getPlanType()).name()
        );

        return ResponseEntity.ok(payload);
    }
}
