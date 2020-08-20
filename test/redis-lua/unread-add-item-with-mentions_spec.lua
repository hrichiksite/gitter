require('./utils')
local call_redis_script = require "./harness";

local inspect = require('inspect')

local USER_1 = "user1"
local ROOM_1 = "room"
local ITEM_1 = "item1"
local ITEM_2 = "item2"
local USER_TROUPE_UNREAD_KEY = "room1";
local TIME_NOW = 1
local TIME_NOW_2 = 22

function under_test(keys, value)
  return call_redis_script('gitter-web-unread-items/lib/redis-lua/unread-add-item-with-mentions.lua', keys, value)
end

function add_item(room, item, time, user_ids, mention_user_ids)
  local keys = {
    EMAIL_KEY
  }

  local values = {
    #user_ids,
    room,
    item,
    time
  }

  for i, user_id in ipairs(user_ids) do
    table.insert(keys, user_troupe_key(user_id, room))
    table.insert(keys, user_badge_key(user_id))
    table.insert(values, user_id)
  end

  if mention_user_ids then
    for i, mention_user_id in ipairs(mention_user_ids) do
      table.insert(keys, user_troupe_mention_key(mention_user_id, room))
      table.insert(keys, user_mention_key(mention_user_id))
    end
  end

  return under_test(keys, values)
end

describe("unread-add-item-with-mentions", function()
  before_each(function()
    redis.call('FLUSHDB')
  end)

  it("should add single items", function()

    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 })
    assert.are.same({ 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)

   it("should not add duplicate items", function()
    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 })
    assert.are.same({ 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 });
    assert.are.same({ -1, 0 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)

  it("should add multiple items", function()
    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 });

    assert.are.same({ 1, 1 }, result)

   assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

    local result = add_item(ROOM_1, ITEM_2, TIME_NOW_2, { USER_1 });
    assert.are.same({ 2, 0 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1, ITEM_2 },
        user_badge_values  = { ROOM_1, '2' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)

  it("should add single mentions items", function()
    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 }, { USER_1 });
    assert.are.same({ 1, 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values       = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) },
        mention_items      = { ITEM_1 },
        user_mention_rooms = { ROOM_1 }
      });

  end)

  it("should add multiple mentions items", function()
    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 }, { USER_1 });
    assert.are.same({ 1, 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values       = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) },
        mention_items      = { ITEM_1 },
        user_mention_rooms = { ROOM_1 }
      });

    local result = add_item(ROOM_1, ITEM_2, TIME_NOW_2, { USER_1 }, { USER_1 });
    assert.are.same({ 2, 0, 2 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1, ITEM_2 },
        user_badge_values  = { ROOM_1, '2' },
        email_values       = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) },
        mention_items      = { ITEM_1, ITEM_2 },
        user_mention_rooms = { ROOM_1 }
      });

  end)

  it("should add single items to a zset", function()
    setupState(USER_1, ROOM_1, {
        user_room_set_type = "zset",
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, 1 }
      });

    local result = add_item(ROOM_1, ITEM_2, TIME_NOW, { USER_1 })
    assert.are.same({ 2, 0 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'zset',
        unread_items       = { ITEM_1, ITEM_2 },
        user_badge_values  = { ROOM_1, '2' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)


  it("zsets should not exceed 100 items", function()
    local items = {}

    for i = 2,101 do
      table.insert(items, "item" .. tostring(i))
    end

    setupState(USER_1, ROOM_1, {
        user_room_set_type = "zset",
        unread_items       = items,
        user_badge_values  = { ROOM_1, 100 }
      });

    local result = add_item(ROOM_1, ITEM_1, 1000, { USER_1 })
    assert.are.same({ 100, 0 }, result)

    table.remove(items, 1)
    table.insert(items, ITEM_1)
    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'zset',
        unread_items       = items,
        user_badge_values  = { ROOM_1, '100' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(1000) }
      });

  end)


  it("should flag the user_troupe for upgrade when count exceeds 100 #upgrade", function()
    local items = {}

    for i = 2,101 do
      table.insert(items, "item" .. tostring(i))
    end

    setupState(USER_1, ROOM_1, {
        user_room_set_type = "set",
        unread_items       = items,
        user_badge_values  = { ROOM_1, 100 }
      });

    local result = add_item(ROOM_1, ITEM_1, TIME_NOW, { USER_1 })
    assert.are.same({ 100, 2 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'zset',
        unread_items       = items,
        user_badge_values  = { ROOM_1, '100' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)


end)
