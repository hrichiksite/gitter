local key_socket = KEYS[1];
local key_active_users = KEYS[2];
local key_mobile_users = KEYS[3];
local key_active_sockets = KEYS[4];
local key_user_lock = KEYS[5];
local key_troupe_users = KEYS[6];
local key_user_sockets = KEYS[7];

local user_id = ARGV[1];
local socket_id = ARGV[2];


-- If the socket doesn't exist, return with a failure code
if redis.call("EXISTS", key_socket) == 0 then
	return { 0 }
end

redis.call("INCR", key_user_lock);
redis.call("EXPIRE", key_user_lock, 10);

local user_socket_count

if redis.call("HEXISTS", key_socket, "mob") == 1 then
	-- Decrement the users score in mobile users
	user_socket_count = -1
	redis.call("ZINCRBY", key_mobile_users, -1, user_id)
	redis.call("ZREMRANGEBYSCORE", key_mobile_users, '-inf', 0)

else
	-- Decrement the users score in active users
	user_socket_count = redis.call("ZINCRBY", key_active_users, -1, user_id)
	redis.call("ZREMRANGEBYSCORE", key_active_users, '-inf', 0)

end


local socket_del_result = redis.call("SREM", key_active_sockets, socket_id)
redis.call("SREM", key_user_sockets, socket_id)



-- Do an eyeballs off as part of the disassociate
local user_in_troupe_count = -1
local total_in_troupe_count = -1

if redis.call("HEXISTS", key_socket, "eb") == 1 then
	user_in_troupe_count = redis.call("ZINCRBY", key_troupe_users, -1, user_id)
	redis.call("ZREMRANGEBYSCORE", key_troupe_users, '-inf', '0')

	total_in_troupe_count = redis.call("ZCARD", key_troupe_users)
end

redis.call("DEL", key_socket)



return { 1, user_socket_count, socket_del_result, user_in_troupe_count, total_in_troupe_count }
