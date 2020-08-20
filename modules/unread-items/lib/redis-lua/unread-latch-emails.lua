  -- Keys are user:troupe keys
  local email_hash_key = table.remove(KEYS, 1)
  local expire_seconds = table.remove(ARGV, 1)

  local result = {}

  for k, v in pairs(KEYS) do
    local r = redis.call("SETNX", v, 1)

    if r == 1 then
      redis.call("EXPIRE", v, expire_seconds)
    end

    table.insert(result, r)
  end

  for k, v in pairs(ARGV) do
    redis.call("HDEL", email_hash_key, v)
  end

  return result