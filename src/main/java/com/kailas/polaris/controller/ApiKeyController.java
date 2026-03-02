package com.kailas.polaris.controller;

import com.kailas.polaris.model.ApiKey;
import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.service.AdminAuditLogService;
import com.kailas.polaris.service.ApiKeyService;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;
    private final AdminAuditLogService adminAuditLogService;

    @PostMapping
    public ResponseEntity<ApiKey> createKey(@RequestParam("plan") PlanType planType) {
        ApiKey apiKey = apiKeyService.createKey(planType);
        adminAuditLogService.log(
                "API_KEY_CREATE",
                "API_KEY",
                apiKey.getId().toString(),
                "Created API key for plan " + apiKey.getPlanType()
        );
        URI location = URI.create("/api/keys/" + apiKey.getId());
        return ResponseEntity.created(location).body(apiKey);
    }

    @GetMapping
    public ResponseEntity<List<ApiKey>> listKeys() {
        return ResponseEntity.ok(apiKeyService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiKey> getKey(@PathVariable UUID id) {
        return apiKeyService.getById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateKey(@PathVariable UUID id) {
        boolean deactivated = apiKeyService.deactivateKeyIfExists(id);
        if (!deactivated) {
            return ResponseEntity.notFound().build();
        }
        adminAuditLogService.log(
                "API_KEY_DEACTIVATE",
                "API_KEY",
                id.toString(),
                "Deactivated API key"
        );
        return ResponseEntity.noContent().build();
    }
}
