  -- Keys are [user:troupe, mention keys]...

  local result = {}
  local key_count = #KEYS/2

  for i = 1,key_count do
  	local index = (i - 1) * 2 + 1;
  	local unread_items_key = KEYS[index]
  	local mentions_key = KEYS[index + 1]

    local key_type = redis.call("TYPE", unread_items_key)["ok"]
    local unread_card, mention_card

    mention_card = redis.call("SCARD", mentions_key)

    if key_type == "set" then
      unread_card = redis.call("SCARD", unread_items_key)
    elseif key_type == "zset" then
      unread_card = redis.call("ZCARD", unread_items_key);
    else
      unread_card = 0;
    end

    table.insert(result, unread_card)
    table.insert(result, mention_card)
  end

  return result
