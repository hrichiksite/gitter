local primary_lock = KEYS[1];
local segment_lock = KEYS[2];
local time_now = ARGV[1];
local expire_time_seconds = ARGV[2];
local max_lock_cycle = tonumber(ARGV[3]);

local obtain_lock = redis.call("SETNX", primary_lock, '1')

-- The case that there is no lock
if obtain_lock == 1 then
	redis.call("EXPIRE", primary_lock, expire_time_seconds)
	redis.call("SETEX", segment_lock, expire_time_seconds, time_now)

	return 1
end

-- There is already a primary lock for the user
-- if there a segment lock
local primary_lock_value = tonumber(redis.call("GET", primary_lock))

-- If this lock is going to push the user
-- over their max locks, abort
if (primary_lock_value >= max_lock_cycle) then
	return 0
end


local obtain_seg_lock = redis.call("SETNX", segment_lock, time_now)
if obtain_seg_lock == 1 then
	return redis.call("INCR", primary_lock)
else
	-- Use already has a segment lock
	return 0
end
