package com.kailas.polaris.service;

import com.kailas.polaris.model.AdminAuditLog;
import com.kailas.polaris.repository.AdminAuditLogRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional
    public void log(String action, String resourceType, String resourceId, String details) {
        adminAuditLogRepository.save(
                AdminAuditLog.builder()
                        .actor(resolveActor())
                        .action(action)
                        .resourceType(resourceType)
                        .resourceId(resourceId)
                        .details(details == null ? "-" : details)
                        .build()
        );
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLog> listRecent(int limit) {
        List<AdminAuditLog> all = adminAuditLogRepository.findTop200ByOrderByCreatedAtDesc();
        if (limit <= 0 || limit >= all.size()) {
            return all;
        }
        return all.subList(0, limit);
    }

    private String resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "system";
        }
        return authentication.getName();
    }
}
