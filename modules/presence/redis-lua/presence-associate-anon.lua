local key_socket_user = KEYS[1];
local key_active_sockets = KEYS[2];
local key_user_sockets = KEYS[3];

local socket_id = ARGV[1];
local create_time = ARGV[2];
local mobile_connection = tonumber(ARGV[3]);
local client_type = ARGV[4];
local realtime_library = ARGV[5];
local troupe_id = ARGV[6];
local oauth_client_id = ARGV[7];
local token = ARGV[8];
local unique_client_id = ARGV[9];

if redis.call("EXISTS", key_socket_user) == 1 then
	return { 0 }
end

redis.call("HSET", key_socket_user, "ctime", create_time)
redis.call("HSET", key_socket_user, "ct", client_type)
if realtime_library ~= "" then
  redis.call("HSET", key_socket_user, "rl", realtime_library)
end
redis.call("HSET", key_socket_user, "tid", troupe_id)
if oauth_client_id ~= "" then
  redis.call("HSET", key_socket_user, "ocid", oauth_client_id)
end
if token ~= "" then
  redis.call("HSET", key_socket_user, "tok", token)
end
if unique_client_id ~= "" then
  redis.call("HSET", key_socket_user, "ucid", unique_client_id)
end

-- For mobile users, add them to the mobile users collection
if mobile_connection == 1 then
	redis.call("HSET", key_socket_user, "mob", 1)
end

redis.call("SADD", key_user_sockets, socket_id)
local socket_add_result = redis.call("SADD", key_active_sockets, socket_id)

return { 1, socket_add_result }
