local key_user_hash = KEYS[1];

local chat_hash = ARGV[1];
local initial_ttl = ARGV[2];

local hincrby_result = redis.call("HINCRBY", key_user_hash, chat_hash, 1)

if hincrby_result == 1 then
  local ttl = redis.call("TTL", key_user_hash)

  if ttl < 0 then
    -- No TTL, set it now
    redis.call("EXPIRE", key_user_hash, initial_ttl)
  end

end

return hincrby_result
