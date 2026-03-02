package com.kailas.polaris.service;

import com.kailas.polaris.model.ApiKey;
import com.kailas.polaris.model.PlanType;
import com.kailas.polaris.repository.ApiKeyRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;

    @Transactional
    public ApiKey createKey(PlanType planType) {
        ApiKey apiKey = ApiKey.builder()
                .keyValue(generateUniqueKeyValue())
                .planType(planType)
                .active(true)
                .build();

        return apiKeyRepository.save(apiKey);
    }

    @Transactional(readOnly = true)
    public Optional<ApiKey> getByKeyValue(String keyValue) {
        return apiKeyRepository.findByKeyValue(keyValue);
    }

    @Transactional(readOnly = true)
    public Optional<ApiKey> getById(UUID id) {
        return apiKeyRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<ApiKey> listAll() {
        return apiKeyRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void deactivateKey(UUID id) {
        deactivateKeyIfExists(id);
    }

    @Transactional
    public boolean deactivateKeyIfExists(UUID id) {
        return apiKeyRepository.findById(id).map(apiKey -> {
            apiKey.setActive(false);
            apiKeyRepository.save(apiKey);
            return true;
        }).orElse(false);
    }

    private String generateUniqueKeyValue() {
        String keyValue;
        do {
            keyValue = UUID.randomUUID().toString();
        } while (apiKeyRepository.findByKeyValue(keyValue).isPresent());
        return keyValue;
    }
}
