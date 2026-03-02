local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

local windowStart = now - window

redis.call("ZREMRANGEBYSCORE", key, 0, windowStart)

local current = redis.call("ZCARD", key)

if current >= limit then
    local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
    if oldest[2] ~= nil then
        local retryAfter = (tonumber(oldest[2]) + window) - now
        if retryAfter < 0 then
            retryAfter = 0
        end
        return {0, retryAfter}
    else
        return {0, window}
    end
end

redis.call("ZADD", key, now, member)
redis.call("EXPIRE", key, window)

return {1, 0}
