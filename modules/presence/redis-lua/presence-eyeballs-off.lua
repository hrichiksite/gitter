local key_socket = KEYS[1];
local key_troupe_users = KEYS[2];
local key_user_lock = KEYS[3];

local user_id = ARGV[1];

if redis.call("HDEL", key_socket, "eb") == 0 then
	return { 0 }
end

redis.call("INCR", key_user_lock);
redis.call("EXPIRE", key_user_lock, 10);


local user_in_troupe_count = redis.call("ZINCRBY", key_troupe_users, -1, user_id)
redis.call("ZREMRANGEBYSCORE", key_troupe_users, '-inf', '0')

local total_in_troupe_count = redis.call("ZCARD", key_troupe_users)

return { 1, user_in_troupe_count, total_in_troupe_count }
