local key_working_set = KEYS[1];
local key_working_output_set = KEYS[2];
local key_active_users = KEYS[3]
local key_mobile_users = KEYS[4]

local user_ids = ARGV;

-- create a temporary set of all the user ids that we want to categorize
for i, name in ipairs(user_ids) do
	redis.call("ZADD", key_working_set, 1, user_ids[i])
end

-- store all the users that are in both the active users set and our temp query set in an output set
redis.call("ZINTERSTORE", key_working_output_set, 2, key_active_users, key_working_set)

-- get all the user ids from the temp output set
local online_user_ids = redis.call("ZRANGEBYSCORE", key_working_output_set, 1, '+inf')

-- delete the temporary sets
redis.call("DEL", key_working_output_set)

-- store all the users that are in both the active users set and our temp query set in an output set
redis.call("ZINTERSTORE", key_working_output_set, 2, key_mobile_users, key_working_set)

-- get all the user ids from the temp output set
local mobile_user_ids = redis.call("ZRANGEBYSCORE", key_working_output_set, 1, '+inf')


redis.call("DEL", key_working_set, key_working_output_set)

return { online_user_ids, mobile_user_ids }
