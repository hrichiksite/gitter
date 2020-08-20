'use strict';

var makeBenchmark = require('../make-benchmark');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');
var Backbone = require('backbone');

function stall() {
  for (var i = 0; i < 1e3; i++) {
    Math.sqrt(i);
  }
}

var ITERATIONS = 1200;

function addSlowEvents(filteredCollection) {
  filteredCollection.on('add', stall);
  filteredCollection.on('remove', stall);
  filteredCollection.on('change', stall);
  filteredCollection.on('reset', stall);
}

function defaultFilter(model) {
  return model.get('i') % 2 === 0;
}

function makeNewCollections() {
  var collection = new Backbone.Collection([]);
  var filteredCollection = new SimpleFilteredCollection([], {
    collection: collection,
    filter: defaultFilter
  });

  addSlowEvents(filteredCollection);

  collection._filteredVersion = filteredCollection;
  return collection;
}

var newStatic = makeNewCollections();

for (var i = 0; i < ITERATIONS; i++) {
  newStatic.add({ id: i, i: i });
}

makeBenchmark({
  tests: {
    'new adds': function() {
      var collection = makeNewCollections();

      for (var i = 0; i < ITERATIONS; i++) {
        collection.add({ id: i, i: i });
      }
    },

    'new changes': function() {
      for (var i = 0; i < ITERATIONS; i++) {
        var c = newStatic.at(i);
        c.set({ i: c.get('i') + 1 });
      }
    },

    'new change filter': function() {
      newStatic.comparator = function(a, b) {
        return a.get('i') - b.get('i');
      };

      for (var i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          newStatic._filteredVersion.setFilter(function(model) {
            return model.get('i') % 3 === 0;
          });
        } else {
          newStatic._filteredVersion.setFilter(defaultFilter);
        }
      }
    }
  }
});
