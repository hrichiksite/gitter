  -- Keys are user:troupe keys
  local result = {}

  for index, key in pairs(KEYS) do
    local key_type = redis.call("TYPE", key)["ok"]
    local items
    
    if key_type == "set" then
      items = redis.call("SMEMBERS", key)
    elseif key_type == "zset" then
      items = redis.call("ZRANGE", key, 0, -1);
    else
      items = {}
    end
    
    table.insert(result, items)
  end
  
  return result
