package com.kailas.polaris.admin;

import com.kailas.polaris.model.AdminAuditLog;
import com.kailas.polaris.service.AdminAuditLogService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AdminAuditLogService adminAuditLogService;

    @GetMapping("/logs")
    public List<AdminAuditLog> listLogs(@RequestParam(value = "limit", defaultValue = "50") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        return adminAuditLogService.listRecent(safeLimit);
    }
}
