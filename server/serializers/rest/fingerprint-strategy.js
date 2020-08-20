'use strict';

class FingerprintStrategy {
  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      fingerprints: item.fingerprints
    };
  }
}

module.exports = FingerprintStrategy;
