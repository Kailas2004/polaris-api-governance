package com.kailas.polaris.exception;

import io.lettuce.core.RedisCommandTimeoutException;
import java.net.ConnectException;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception ex) throws Exception {
        if (!isRedisInfrastructureFailure(ex)) {
            throw ex;
        }

        log.warn("Redis infrastructure failure converted to 503", ex);
        Map<String, Object> body = Map.of(
                "error", "Rate limiting infrastructure unavailable",
                "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }

    private boolean isRedisInfrastructureFailure(Throwable ex) {
        while (ex != null) {
            if (ex instanceof RedisConnectionFailureException ||
                    ex instanceof RedisSystemException ||
                    ex instanceof RedisCommandTimeoutException ||
                    ex instanceof DataAccessException ||
                    ex instanceof ConnectException ||
                    isPoolException(ex)) {
                return true;
            }
            ex = ex.getCause();
        }
        return false;
    }

    private boolean isPoolException(Throwable ex) {
        Package pkg = ex.getClass().getPackage();
        if (pkg != null) {
            String name = pkg.getName();
            return name.startsWith("org.apache.commons.pool2");
        }
        return false;
    }
}
