require "./harness";

EMAIL_KEY = "test:email";

user_troupe_key = function (user, room)
  return "test:unread:" .. user .. ":" .. room
end

user_badge_key = function (user)
  return "test:ub:" .. user
end

user_troupe_mention_key = function(user, room)
  return "m:" .. user .. ':' .. room
end

user_mention_key = function(user)
  return "m:" .. user
end

user_email_latch_key = function(user, room)
  return "uel:" .. room .. ":" .. user
end

assertState = function (user, room, values)
  if values['user_room_set_type'] then
    local user_room_set_type = redis.call('TYPE', user_troupe_key(user, room))["ok"]
    assert.are.equals(values['user_room_set_type'], user_room_set_type)
  end

  if values['user_badge_values'] then
    local badges = redis.call('ZRANGE', user_badge_key(user), 0, -1, 'WITHSCORES');
    assert.are.same(values['user_badge_values'], badges)
  end

  if values['unread_items'] then
    local user_room_set_type = redis.call('TYPE', user_troupe_key(user, room))["ok"]
    local items
    if user_room_set_type == "zset" then
      items = redis.call('ZRANGE', user_troupe_key(user, room), 0, -1)
    else
      items = redis.call('SMEMBERS', user_troupe_key(user, room))
    end

    table.sort(values['unread_items'])
    table.sort(items);
    assert.are.same(values['unread_items'], items)
  end

  if values['email_values'] then
    -- Check that the user is added to the email hash
    local hash = redis.call('HGETALL', EMAIL_KEY)
    assert.are.same(values['email_values'], hash);
  end

  if values['mention_items'] then
    local items = redis.call('SMEMBERS', user_troupe_mention_key(user, room))
    table.sort(values['mention_items'])
    table.sort(items);
    assert.are.same(values['mention_items'], items)
  end

  if values['user_mention_rooms'] then
    local items = redis.call('SMEMBERS', user_mention_key(user))
    table.sort(values['user_mention_rooms'])
    table.sort(items);
    assert.are.same(values['user_mention_rooms'], items)
  end
end


setupState = function (user, room, values)
  local type =  values['user_room_set_type']
  local items = values['unread_items'];

  local items_key = user_troupe_key(user, room);
  redis.call('DEL', items_key);

  for i, item_id in ipairs(items) do
    if type == 'set' then
      redis.call('SADD', items_key, item_id);
    else
      redis.call('ZADD', items_key, i, item_id);
    end
  end

  local user_badge_values = values['user_badge_values']
  if user_badge_values then
    local k = user_badge_key(user);
    redis.call('DEL', k);

    for i = 1,#user_badge_values,2 do
      local room_id = user_badge_values[i]
      local count = user_badge_values[i + 1]

      redis.call('ZADD', k, count, room_id);
    end
  end

  local mention_items = values['mention_items']
  if mention_items then
    local k = user_troupe_mention_key(user, room);
    redis.call('DEL', k);

    for i, mention_item_id in ipairs(mention_items) do
      redis.call('SADD', k, mention_item_id);
    end
  end

  local user_mention_rooms = values['user_mention_rooms']
  if user_mention_rooms then
    local k = user_mention_key(user);
    redis.call('DEL', k);

    for i, room_id in ipairs(user_mention_rooms) do
      redis.call('SADD', k, room_id);
    end
  end

end
