package com.kailas.polaris.repository;

import com.kailas.polaris.model.AdminAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, UUID> {

    List<AdminAuditLog> findTop200ByOrderByCreatedAtDesc();
}
