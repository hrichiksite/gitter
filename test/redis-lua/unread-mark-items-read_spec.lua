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
  return call_redis_script('gitter-web-unread-items/lib/redis-lua/unread-mark-items-read.lua', keys, value)
end

function mark_items_read(user, room, items)
  local keys = {
    user_badge_key(user),
    user_troupe_key(user, room),
    EMAIL_KEY,
    user_troupe_mention_key(user, room),
    user_mention_key(user),
    user_email_latch_key(user, room)
  }
  local values = { room, user }

  for i, item_id in ipairs(items) do
    table.insert(values, item_id)
  end

  return under_test(keys, values)
end


describe("unread-add-mark-items-read", function()
  before_each(function()
    redis.call('FLUSHDB')
  end)

  local user_room_set_type

  function do_mark_items_read_tests()

    it("should remove a single item that is the only unread item", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1 },
          user_badge_values  = { ROOM_1, 1 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 0, 0, 1 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = 'none',
        unread_items       = { },
        user_badge_values  = { },
        email_values  = { }
      });

    end)

    it("should remove two items that are the only unread items", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1, ITEM_2 },
          user_badge_values  = { ROOM_1, 2 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1, ITEM_2 });
      assert.are.same({ 0, 0, 1 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = 'none',
        unread_items       = { },
        user_badge_values  = { },
        email_values  = { }
      });

    end)

    it("should remove one item leaving one item in the room", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1, ITEM_2 },
          user_badge_values  = { ROOM_1, 2 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 1, -1, 0 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = user_room_set_type,
        unread_items       = { ITEM_2 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { }
      });

    end)

    it("should handle an item which is not marked as unread", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1 },
          user_badge_values  = { ROOM_1, 1 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_2 });
      assert.are.same({ 1, -1, 0 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = user_room_set_type,
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values       = { }
      });

    end)

    it("should mark mentions as read when there is only one mention", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1 },
          user_badge_values  = { ROOM_1, 1 },
          mention_items      = { ITEM_1 },
          user_mention_rooms = { ROOM_1 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 0, 0, 1 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = "none",
        unread_items       = { },
        user_badge_values  = { },
        email_values       = { },
        mention_items      = { },
        user_mention_rooms = { }
      });

    end)


    it("should mark one mention as read with another mention left unread", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1, ITEM_2 },
          user_badge_values  = { ROOM_1, 2 },
          mention_items      = { ITEM_1, ITEM_2 },
          user_mention_rooms = { ROOM_1 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 1, 1, 0 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = user_room_set_type,
        unread_items       = { ITEM_2 },
        user_badge_values  = { ROOM_1, '1' },
        email_values       = { },
        mention_items      = { ITEM_2 },
        user_mention_rooms = { ROOM_1 }
      });

    end)

    it("should mark an mention as read while maintaining any non mention unread items", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1, ITEM_2 },
          user_badge_values  = { ROOM_1, 2 },
          mention_items      = { ITEM_1 },
          user_mention_rooms = { ROOM_1 }
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 1, 0, 0 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = user_room_set_type,
        unread_items       = { ITEM_2 },
        user_badge_values  = { ROOM_1, '1' },
        email_values       = { },
        mention_items      = { },
        user_mention_rooms = { }
      });

    end)

    it("should fix an incorrect badge number when the last item in a room is marked as read when the value is over", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1 },
          user_badge_values  = { ROOM_1, 2 } -- This should be one, but it's intentionally incorrect
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 0, 0, 1 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = 'none',
        unread_items       = { },
        user_badge_values  = { },
        email_values  = { }
      });

    end)

    it("should fix an incorrect badge number when the last item in a room is marked as read when the value is below the correct number", function()
      setupState(USER_1, ROOM_1, {
          user_room_set_type = user_room_set_type,
          unread_items       = { ITEM_1, ITEM_2 },
          user_badge_values  = { } -- This should be room1: one, but it's intentionally incorrect
        });

      local result = mark_items_read(USER_1, ROOM_1, { ITEM_1 });
      assert.are.same({ 1, -1, 1 }, result)

      assertState(USER_1, ROOM_1, {
        user_room_set_type = user_room_set_type,
        unread_items       = { ITEM_2 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { }
      });

    end)

  end

  describe("set", function()
    before_each(function()
      user_room_set_type = "set"
    end)

    do_mark_items_read_tests()
  end)

  describe("zset", function()
    before_each(function()
      user_room_set_type = "zset"
    end)

    do_mark_items_read_tests()
  end)

end)
