--
-- Mark a whole lot of unread-items as read for a given user
--
-- KEYS:
--   1     email_hash_key      // unread:email_notify               HASH of first unread items for users
--   Group 1: (user_count entries)
--   [n]   user_troupe         // unread:chat:<userId>:<troupeId>   SET or ZSET [item=time] of unread items
--   [n+1] user_badge          // ub:<userId>                       ZSET of [room=unread_count]
--   Group 2: (remaining entries)
--   [n]   user_troupe_mention  // m:<userId>:<troupeId>             SET of mentions for user in room
--   [n+1] user_mention         // m:<userId>                        SET of all troupes with mentions for this user
--
-- VALUES
--   [1] user_count
--   [2] troupe_id
--   [3] item_id
--   [4] time_now
--   [5..n] user_ids
--
-- RETURNS table
--

local user_count = ARGV[1]
local troupe_id = ARGV[2]
local item_id = ARGV[3]
local time_now = ARGV[4]

local email_hash_key = table.remove(KEYS, 1)

local MAX_ITEMS = 100
local MAX_ITEMS_PLUS_ONE = MAX_ITEMS + 1


-- Update values in the email hash with time_now, if a value does not exist
local userIds = ARGV
for i = 5, #ARGV do
  local user_id = ARGV[i]
  redis.call("HSETNX", email_hash_key, troupe_id..':'..user_id, time_now)
end

local get_timestamp = function(object_id)
  local timestamp = tonumber(string.sub(object_id,1,8), 16)
  if timestamp then return timestamp * 1000; end
  return 1; -- Fallback to using a constant. Redis will sort alphabetically, which is fine
end

local update_set_to_zset = function(user_troupe_key)
  local items = redis.call("SMEMBERS", user_troupe_key)
  local zadd_args = { "ZADD", user_troupe_key }

  for i, item_id in pairs(items) do
    local timestamp =  get_timestamp(item_id)
    table.insert(zadd_args, timestamp)
    table.insert(zadd_args, item_id)
  end

  redis.call("DEL", user_troupe_key)
  redis.call(unpack(zadd_args))
  redis.call("ZREMRANGEBYRANK", user_troupe_key, 0, -MAX_ITEMS_PLUS_ONE)
end

local result = {};

for i = 1, user_count do
  local user_troupe_key = table.remove(KEYS, 1)
  local user_badge_key =  table.remove(KEYS, 1)


  local item_count = -1 -- -1 means do not update
  local flag = 0 -- bit flags: 1 = badge_update, 2 = upgrade_key
  local key_type = redis.call("TYPE", user_troupe_key)["ok"];

  if key_type == "zset" then
    -- We have a ZSET
    if redis.call("ZADD", user_troupe_key, time_now, item_id) > 0 then
      -- Remove all items below the last 100 ranked items
      local items_removed = redis.call("ZREMRANGEBYRANK", user_troupe_key, 0, -MAX_ITEMS_PLUS_ONE)

      -- Only if no items have been removed should we increment the badge count.
      -- If we're removing items, it means that we've hit the max and should
      -- not be counting
      if items_removed == 0 then
        item_count = redis.call("ZCARD", user_troupe_key)
        redis.call("ZINCRBY", user_badge_key, 1, troupe_id)
      else
        -- If items were removed, the set must have exactly 100 items left in it
        item_count = MAX_ITEMS;
      end
    end
  else
    if redis.call("SADD", user_troupe_key, item_id) > 0 then
      item_count = redis.call("SCARD", user_troupe_key)

      -- Figure out if its time to upgrade to a ZSET
      if item_count >= MAX_ITEMS then
        flag = flag + 2
        update_set_to_zset(user_troupe_key)
        item_count = MAX_ITEMS

        redis.call("ZADD", user_badge_key, MAX_ITEMS, troupe_id)
      else
        -- If this is the first for this troupe for this user, the badge count is going to increment
        local zincr_result = tonumber(redis.call("ZINCRBY", user_badge_key, 1, troupe_id));

        if zincr_result == 1 then
          flag = 1
        end
      end

    end
  end

  table.insert(result, item_count)
  table.insert(result, flag)
end

-- Now deal with the mentions
while #KEYS > 0 do
  local user_troupe_mention_key = table.remove(KEYS, 1)
  local user_mention_key = table.remove(KEYS, 1)

  local count = -1;

  if redis.call("SADD", user_troupe_mention_key, item_id) > 0 then
    count = redis.call("SCARD", user_troupe_mention_key);
    -- If count equals exactly one then this is the first time this user has been mentioned in this
    -- room, so we'll need to add this troupeId to the users mention key
    if count == 1 then
      redis.call("SADD", user_mention_key, troupe_id)
    end
  end

  table.insert(result, count);
end


return result
