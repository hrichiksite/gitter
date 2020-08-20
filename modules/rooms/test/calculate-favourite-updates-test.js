'use strict';

const assert = require('assert');
const calculateFavouriteUpdates = require('../lib/calculate-favourite-updates');

describe('calculateFavouriteUpdates', () => {
  it('updates for subsequent favourites', () => {
    const roomIdFavouritePositionPairs = [
      ['1bc06a50d850640967290b2f', 19],
      ['2bc06a50d850640967290b2f', 20],
      ['3bc06a50d850640967290b2f', 21]
    ];

    const updates = calculateFavouriteUpdates(
      '9bc06a50d850640967290b2f',
      20,
      roomIdFavouritePositionPairs
    );

    assert.deepEqual(updates, [['2bc06a50d850640967290b2f', 21], ['3bc06a50d850640967290b2f', 22]]);
  });

  it('ignores non-number favourite', () => {
    const roomIdFavouritePositionPairs = [
      ['1bc06a50d850640967290b2f', 0],
      ['2bc06a50d850640967290b2f', undefined],
      ['3bc06a50d850640967290b2f', 19],
      ['4bc06a50d850640967290b2f', 20],
      ['5bc06a50d850640967290b2f', null],
      ['6bc06a50d850640967290b2f', 21],
      ['7bc06a50d850640967290b2f', false]
    ];

    const updates = calculateFavouriteUpdates(
      '9bc06a50d850640967290b2f',
      20,
      roomIdFavouritePositionPairs
    );

    assert.deepEqual(updates, [['4bc06a50d850640967290b2f', 21], ['6bc06a50d850640967290b2f', 22]]);
  });
});
