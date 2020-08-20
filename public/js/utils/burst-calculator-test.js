'use strict';

const burstCalculator = require('./burst-calculator');

describe('burst-calculator', () => {
  const testUserA = { id: 'abc', username: 'john_smith' };

  it('should handle empty array', () => {
    const result = burstCalculator.parse([]);
    expect(result).toEqual([]);
  });

  it('should mark one chatItem as start of the burst', () => {
    const chatItem = {
      fromUser: testUserA,
      sent: new Date()
    };
    const result = burstCalculator.parse([chatItem]);
    expect(result[0]).toEqual({ burstStart: true, ...chatItem });
  });

  it('should group two eligible messages into a burst', () => {
    const chatItem1 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:00:00.000Z'
    };
    const chatItem2 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:01:00.000Z'
    };
    const result = burstCalculator.parse([chatItem1, chatItem2]);
    expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
    expect(result[1]).toEqual({ burstStart: false, ...chatItem2 });
  });

  it('should reset burst with a status message', () => {
    const chatItem1 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:00:00.000Z'
    };
    const chatItem2 = {
      status: true,
      fromUser: testUserA,
      sent: '2020-02-04T00:01:00.000Z'
    };
    const result = burstCalculator.parse([chatItem1, chatItem2]);
    expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
    expect(result[1]).toEqual({ burstStart: true, ...chatItem2 });
  });

  it('should reset burst with a different user', () => {
    const testUserB = { id: 'def', username: 'peter_griffin' };
    const chatItem1 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:00:00.000Z'
    };
    const chatItem2 = {
      fromUser: testUserB,
      sent: '2020-02-04T00:01:00.000Z'
    };
    const result = burstCalculator.parse([chatItem1, chatItem2]);
    expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
    expect(result[1]).toEqual({ burstStart: true, ...chatItem2 });
  });

  it('should reset burst when more than 5 minutes elapses from the burst start', () => {
    const chatItem1 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:00:00.000Z'
    };
    const chatItem2 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:02:00.000Z'
    };
    // 4 minutes since the last message, this would discover an issue if we only
    // measured 5 minutes since the previous message
    const chatItem3 = {
      fromUser: testUserA,
      sent: '2020-02-04T00:06:00.000Z'
    };
    const result = burstCalculator.parse([chatItem1, chatItem2, chatItem3]);
    expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
    expect(result[1]).toEqual({ burstStart: false, ...chatItem2 });
    expect(result[2]).toEqual({ burstStart: true, ...chatItem3 });
  });

  describe('thread messages', () => {
    it('should ignore thread messages and compute burst only for MMF', () => {
      const chatItem1 = {
        fromUser: testUserA,
        sent: '2020-02-04T00:00:00.000Z'
      };
      // this message will get ignored and no burst attribute is added
      const chatItem2 = {
        parentId: 'xyz',
        fromUser: testUserA,
        sent: '2020-02-04T00:01:00.000Z'
      };
      // this message continues the burst in main message feed
      const chatItem3 = {
        fromUser: testUserA,
        sent: '2020-02-04T00:02:00.000Z'
      };
      const result = burstCalculator.parse([chatItem1, chatItem2, chatItem3]);
      expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
      expect(result[1]).toEqual({ ...chatItem2 });
      expect(result[2]).toEqual({ burstStart: false, ...chatItem3 });
    });

    it('should ignore thread messages and only reset burst if MMF chat message users differ', () => {
      const testUserB = { id: 'def', username: 'peter_griffin' };
      const chatItem1 = {
        fromUser: testUserA,
        sent: '2020-02-04T00:00:00.000Z'
      };
      // this message will get ignored and no burst attribute is added
      const chatItem2 = {
        parentId: 'xyz',
        fromUser: testUserB,
        sent: '2020-02-04T00:01:00.000Z'
      };
      // this message restarts the burst in main message feed, we validate that we don't continue burst from the previous thread message
      const chatItem3 = {
        fromUser: testUserB,
        sent: '2020-02-04T00:02:00.000Z'
      };
      const result = burstCalculator.parse([chatItem1, chatItem2, chatItem3]);
      expect(result[0]).toEqual({ burstStart: true, ...chatItem1 });
      expect(result[1]).toEqual({ ...chatItem2 });
      expect(result[2]).toEqual({ burstStart: true, ...chatItem3 });
    });
  });

  describe('complex sanity check scenarios', () => {
    const testUserB = { id: 'def', username: 'peter_griffin' };

    const baseTimeAddMinutes = minutes => {
      const base = new Date('2020-02-04T00:00:00.000Z');
      base.setMinutes(minutes);
      return base.toISOString();
    };

    const removeBurstDataForTesting = items =>
      items.map(item => {
        const newItem = { ...item };
        delete newItem.burstStart;
        return newItem;
      });

    it('should calculate bursts for multiple messages', () => {
      const expected = [
        {
          fromUser: testUserA,
          sent: baseTimeAddMinutes(0),
          burstStart: true
        },
        // reset burst, different user
        {
          fromUser: testUserB,
          sent: baseTimeAddMinutes(1),
          burstStart: true
        },
        // continue burst
        {
          fromUser: testUserB,
          sent: baseTimeAddMinutes(2),
          burstStart: false
        },
        //reset burst status
        {
          fromUser: testUserB,
          sent: baseTimeAddMinutes(3),
          status: true,
          burstStart: true
        },
        // reset burst, previous was status
        {
          fromUser: testUserB,
          sent: baseTimeAddMinutes(4),
          burstStart: true
        },
        // continue burst
        {
          fromUser: testUserB,
          sent: baseTimeAddMinutes(5),
          burstStart: false
        }
      ];
      const result = burstCalculator.parse(removeBurstDataForTesting(expected));
      expect(result).toEqual(expected);
    });
  });
});
