package com.kailas.polaris.interceptor;

import com.kailas.polaris.limiter.RateLimitDecision;
import com.kailas.polaris.limiter.RateLimiterManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final String API_KEY_HEADER = "X-API-KEY";

    private final RateLimiterManager rateLimiterManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String key = request.getHeader(API_KEY_HEADER);
        if (key == null || key.isBlank()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }

        try {
            RateLimitDecision decision = rateLimiterManager.check(key);
            if (!decision.allowed()) {
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
                return false;
            }
        } catch (IllegalArgumentException ex) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return false;
        } catch (IllegalStateException ex) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return false;
        }

        return true;
    }
}
