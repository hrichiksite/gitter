--
-- Mark a whole lot of unread-items as read for a given user
--
-- KEYS:
--   [1] user_badge          // ub:<userId>                       ZSET of [room=unread_count]
--   [2] user_troupe         // unread:chat:<userId>:<troupeId>   SET or ZSET [item=time] of unread items
--   [3] email_hash          // unread:email_notify               HASH of first unread items for users
--   [4] user_troupe_mention // m:<userId>:<troupeId>             SET of unread items in a room
--   [5] user_mention        // m:<userId>                        SET of all troupes with mentions for this user
--   [6] user_email_latch    // uel:<troupeId>:<userId>           STRING used for locking
--
-- VALUES
--   [1] troupe_id
--   [2] user_id
--   [3..n] item_id
--
-- RETURNS table
--   [1] unread_item_count   // -1 if it has not changed
--   [2] mention_count       // -1 if it has not changed
--   [3] flags               // bit 0 (1) indicates that the notify badge for the user needs updating
--

local user_badge_key = KEYS[1]
local user_troupe_key = KEYS[2]
local email_hash_key = KEYS[3]
local user_troupe_mention_key = KEYS[4]
local user_mention_key = KEYS[5]
local user_email_latch_key = KEYS[6];

local troupe_id = ARGV[1]
local user_id = ARGV[2]

local key_type = redis.call("TYPE", user_troupe_key)["ok"]

local mentions_removed = false

-- For each item....
for i = 3, #ARGV do
  local item_id = ARGV[i]

  if key_type == "zset" then
    redis.call("ZREM", user_troupe_key, item_id)
  elseif key_type == "set" then
    redis.call("SREM", user_troupe_key, item_id)
  end

  -- Remove the mention if it exists too
  if redis.call("SREM", user_troupe_mention_key, item_id) > 0 then
    mentions_removed = true
  end

end

local new_card
local new_mention_card = -1
local flag = 0

if key_type == "zset" then
  new_card = redis.call("ZCARD", user_troupe_key)
elseif key_type == "set" then
  new_card = redis.call("SCARD", user_troupe_key)
else
  new_card = 0
end

-- This should actually be taken care of by a call to
-- remove-user-mentions, but we do it here too
-- in order to prevent consistency problems
if new_card == 0 then

  new_mention_card = redis.call("SCARD", user_troupe_mention_key)

  if new_mention_card == 0 then
    local r1 = redis.call("DEL", user_troupe_mention_key) > 0
    local r2 = redis.call("SREM", user_mention_key, troupe_id) > 0
    local r3 = redis.call("ZREM", user_badge_key, troupe_id) > 0

    if r1 or r2 or r3 then
      -- Even though the cardinality was zero
      -- items exists
      flag = 1
    end
  end

else

  -- If the score for the user_badge is wrong, we'll need to
  -- update the badge for the client
  local current_zscore = redis.call("ZSCORE", user_badge_key, troupe_id)
  if (not current_zscore) or (tonumber(current_zscore) <= 0) then
    -- This should never happen
    flag = 1
  end

  -- Set the count of unread items in the user_badge key
  redis.call("ZADD", user_badge_key, new_card, troupe_id)

  if mentions_removed then
    new_mention_card = redis.call("SCARD", user_troupe_mention_key);
    if new_mention_card == 0 then
      -- If new_mention_card is zero, then this user no longer has any mentions in this troupe
      -- and we can remove the troupeId from the users mention key
      redis.call("SREM", user_mention_key, troupe_id)
    end
  end
end

-- Remove this user from the list of people who may get an email
redis.call("DEL", user_email_latch_key);
redis.call("HDEL", email_hash_key, troupe_id..':'..user_id)

return { new_card, new_mention_card, flag }
