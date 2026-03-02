package com.kailas.polaris.repository;

import com.kailas.polaris.model.ApiKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    Optional<ApiKey> findByKeyValue(String keyValue);

    List<ApiKey> findAllByOrderByCreatedAtDesc();
}
