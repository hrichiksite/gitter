local key_socket_user = KEYS[1];
local key_user_lock = KEYS[2];
local key_troupe_users = KEYS[3];
local key_prev_troupe_users = KEYS[4];

local user_id = ARGV[1];
local socket_id = ARGV[2];
local troupe_id = ARGV[3];
local known_prev_troupe_id = ARGV[4];
local is_eyeballs_on = ARGV[5];

if redis.call("EXISTS", key_socket_user) ~= 1 then
	-- socket does not exist
	return { 0 }
end

redis.call("INCR", key_user_lock);
redis.call("EXPIRE", key_user_lock, 10);

local prev_troupe_id = redis.call("HGET", key_socket_user, "tid")
local was_eyeballs_on = redis.call("HGET", key_socket_user, "eb") == "1"

local user_in_troupe_count = -1
local user_in_prev_troupe_count = -1

-- Theres a very small chance the troupe has changed this the app server
-- queried for the existing value. Double check and don't process
-- this request if that's the case
if known_prev_troupe_id ~= prev_troupe_id then
	return { 0 }
end

-- Eyeballs off the previous troupe
if was_eyeballs_on and prev_troupe_id then
	user_in_prev_troupe_count = redis.call("ZINCRBY", key_prev_troupe_users, -1, user_id)
	redis.call("ZREMRANGEBYSCORE", key_prev_troupe_users, '-inf', '0')
end

if troupe_id and troupe_id ~= "" then
	-- If we are reassociating with a new troupe
	redis.call("HSET", key_socket_user, "tid", troupe_id)

	if is_eyeballs_on and user_id and user_id ~= "" then
		-- Set eyeballs status for non-anonymous users
		user_in_troupe_count = redis.call("ZINCRBY", key_troupe_users, 1, user_id)
		redis.call("HSET", key_socket_user, "eb", 1)
	else
		-- Clear eyeballs if off or anonymous
		redis.call("HDEL", key_socket_user, "eb")
	end
else
	-- No longer associated with a troupe
	redis.call("HDEL", key_socket_user, "tid", "eb")
end

return { 1, user_in_troupe_count, user_in_prev_troupe_count  }
