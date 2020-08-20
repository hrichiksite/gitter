local key_socket = KEYS[1];
local key_active_sockets = KEYS[2];
local key_user_sockets = KEYS[3];

local socket_id = ARGV[1];

local socket_del_result = redis.call("SREM", key_active_sockets, socket_id)
redis.call("SREM", key_user_sockets, socket_id)

-- If the socket doesn't exist, return with a failure code
if redis.call("EXISTS", key_socket) == 0 then
	return { 0, socket_del_result }
end


redis.call("DEL", key_socket)

return { 1, socket_del_result }
