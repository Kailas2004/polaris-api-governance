package com.kailas.polaris.config;

import java.util.List;
import io.lettuce.core.ClientOptions;
import io.lettuce.core.api.StatefulConnection;
import java.time.Duration;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettucePoolingClientConfiguration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory(LettuceClientConfiguration clientConfiguration) {
        RedisStandaloneConfiguration config =
                new RedisStandaloneConfiguration("localhost", 6379);
        return new LettuceConnectionFactory(config, clientConfiguration);
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(LettuceConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        StringRedisSerializer serializer = new StringRedisSerializer();
        template.setKeySerializer(serializer);
        template.setValueSerializer(serializer);
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public LettuceClientConfiguration lettuceClientConfiguration() {
        GenericObjectPoolConfig<StatefulConnection<?, ?>> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(8);
        poolConfig.setMaxIdle(8);
        poolConfig.setMinIdle(0);

        ClientOptions clientOptions = ClientOptions.builder()
                .autoReconnect(false)
                .build();

        return LettucePoolingClientConfiguration.builder()
                .commandTimeout(Duration.ofSeconds(2))
                .shutdownTimeout(Duration.ofMillis(100))
                .clientOptions(clientOptions)
                .poolConfig(poolConfig)
                .build();
    }

    @Bean
    public RedisScript<List> slidingWindowScript() {
        return RedisScript.of("""
                -- KEYS[1] = redisKey
                -- ARGV[1] = now
                -- ARGV[2] = window
                -- ARGV[3] = limit
                -- ARGV[4] = member

                local key = KEYS[1]
                local now = tonumber(ARGV[1])
                local window = tonumber(ARGV[2])
                local limit = tonumber(ARGV[3])
                local member = ARGV[4]

                redis.call("ZREMRANGEBYSCORE", key, 0, now - window)

                local count = redis.call("ZCARD", key)

                if count >= limit then
                    local earliest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
                    if earliest[2] ~= nil then
                        local retryAfter = (tonumber(earliest[2]) + window) - now
                        if retryAfter < 0 then
                            retryAfter = 0
                        end
                        return {0, retryAfter}
                    end
                    return {0, window}
                end

                redis.call("ZADD", key, now, member)
                redis.call("EXPIRE", key, window)

                return {1, 0}
                """, List.class);
    }
}
