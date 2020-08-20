-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupeId, itemId]
local troupe_id = ARGV[1]
local item_id = ARGV[2];

local key_count = #KEYS/4


local result = {}

for i = 1,key_count do
	local index = (i - 1) * 4 + 1;
	local user_troupe_key = KEYS[index]
	local user_badge_key = KEYS[index + 1]
	local user_troupe_mention_key = KEYS[index + 2]
	local user_mention_key = KEYS[index + 3]

	local key_type = redis.call("TYPE", user_troupe_key)["ok"]

	local removed;										-- number of items remove
	local card = -1; 									-- count post remove
	local mention_count = -1          -- mention count
	local flag = 0;                   -- flag 1 means update user badge, 2 means last mention removed

	if key_type == "set" then
	  removed = redis.call("SREM", user_troupe_key, item_id)

	  if removed > 0 then
			card = redis.call("SCARD", user_troupe_key)
		end

	elseif key_type == "zset" then
	  removed = redis.call("ZREM", user_troupe_key, item_id)
	  if removed > 0 then
	  	card = redis.call("ZCARD", user_troupe_key)
	  end
  else
  	removed = 0;  
	end

	-- No unread items implies no mentions either
	if card == 0 then
		local d1 = redis.call("DEL", user_troupe_mention_key)
		local d2 = redis.call("SREM", user_mention_key, troupe_id);
		
		if d1 > 0 or d2 > 0 then
			mention_count = 0
		end
	else
		local d1 = redis.call("SREM", user_troupe_mention_key, item_id)
		if d1 > 0 then
			mention_count = redis.call("SCARD", user_troupe_mention_key)
			
			if mention_count == 0 then
				redis.call("SREM", user_mention_key, troupe_id)
			end
		end

		
	end


	-- If this item has not already been removed.....
	if removed > 0 then
		-- Then we need to decrement the ZSET for this user for this troupe

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, -1, troupe_id)) <= 0 then
			redis.call("ZREMRANGEBYSCORE", user_badge_key, '-inf', 0)
			flag = flag + 1;
		end
	end

	table.insert(result, card)
	table.insert(result, mention_count)
	table.insert(result, flag)
end

return result
