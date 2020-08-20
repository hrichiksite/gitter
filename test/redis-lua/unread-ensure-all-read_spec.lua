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
  return call_redis_script('gitter-web-unread-items/lib/redis-lua/unread-ensure-all-read.lua', keys, value)
end

function ensureAllRead(room, user_id)
  local keys = {
    user_badge_key(user_id),
    user_troupe_key(user_id, room),
    EMAIL_KEY,
    user_troupe_mention_key(user_id, room),
    user_mention_key(user_id),
    user_email_latch_key(user_id, room)
  }

  local values = {
    room,
    user_id
  }

  return under_test(keys, values)
end

describe("unread-ensure-all-read", function()
  before_each(function()
    redis.call('FLUSHDB')
  end)

  it("should delete all keys", function()
    setupState(USER_1, ROOM_1, {
        user_room_set_type = "zset",
        unread_items       = { ITEM_1 },
        mention_items      = { ITEM_1 },
        user_badge_values  = { ROOM_1, 1 }
      });

    local result = ensureAllRead(ROOM_1, USER_1)
    assert.are.equals(5, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'none',
        unread_items       = { },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  null }
      });

  end)

end)
