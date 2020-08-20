'use strict';

var makeBenchmark = require('../make-benchmark');
var lazy = require('lazy.js');

var items = lazy.range(1000).map(function(x, index) {
  return {
    oneToOne: true,
    oneToOneUsers: [
      {
        userId: 'user' + index
      },
      {
        userId: 'user' + (index + 1)
      }
    ]
  };
});

var approach1 = items
  .filter(function(troupe) {
    return troupe.oneToOne;
  })
  .map(function(troupe) {
    return troupe.oneToOneUsers;
  })
  .flatten()
  .map(function(troupeOneToOneUser) {
    return troupeOneToOneUser.userId;
  })
  .uniq();

var approach2 = items
  .filter(function(troupe) {
    return troupe.oneToOne;
  })
  .map(function(troupe) {
    return [troupe.oneToOneUsers[0].userId, troupe.oneToOneUsers[1].userId];
  })
  .flatten()
  .uniq();

var approach3a = items
  .filter(function(troupe) {
    return troupe.oneToOne;
  })
  .map(function(troupe) {
    return troupe.oneToOneUsers[0].userId;
  });

var approach3b = items
  .filter(function(troupe) {
    return troupe.oneToOne;
  })
  .map(function(troupe) {
    return troupe.oneToOneUsers[1].userId;
  });

var approach3 = approach3a.union(approach3b).uniq();

var currentUserId = 'user1';
var approach4 = items
  .filter(function(troupe) {
    return troupe.oneToOne;
  })
  .map(function(troupe) {
    if (currentUserId === troupe.oneToOneUsers[0].userId) {
      return troupe.oneToOneUsers[1].userId;
    } else {
      return troupe.oneToOneUsers[0].userId;
    }
  });

makeBenchmark({
  maxTime: 3,

  tests: {
    'map+flatten+uniq#isEmpty': function() {
      approach1.isEmpty();
    },

    'map+flatten+uniq#size': function() {
      approach1.size();
    },

    'flatten+uniq#isEmpty': function() {
      approach2.isEmpty();
    },

    'flatten+uniq#size': function() {
      approach2.size();
    },

    'union+uniq#isEmpty': function() {
      approach3.isEmpty();
    },

    'union+uniq#size': function() {
      approach3.size();
    },

    'map#isEmpty': function() {
      approach4.isEmpty();
    },

    'map#size': function() {
      approach4.size();
    }
  }
});
