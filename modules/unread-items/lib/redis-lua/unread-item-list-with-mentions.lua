-- Key is are user:troupe key, user:troupe mention key
local userkey = KEYS[1]
local mentionkey = KEYS[2]

local unread_items
local mentions

local key_type = redis.call("TYPE", userkey)["ok"]
if key_type == "set" then
  unread_items = redis.call("SMEMBERS", userkey)
elseif key_type == "none" then
  unread_items = {}
else
  unread_items = redis.call("ZRANGE", userkey, 0, -1);
end

mentions = redis.call("SMEMBERS", mentionkey)

return { unread_items, mentions }
