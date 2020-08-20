/*jslint node:true, unused:true*/
/*global describe:true */

'use strict';

var _ = require('lodash');

module.exports = function generateTests(fixtures, generator, meta) {
  if (!meta) meta = {};

  fixtures.forEach(function(fixture) {
    var thisMeta;

    if (!fixture.meta) {
      thisMeta = fixture; // Shorter fixtures
    } else {
      thisMeta = fixture.meta;
    }

    var name = fixture.name;
    var fixtureMeta = _.extend({}, meta, thisMeta);

    if (fixture.tests) {
      // Branch
      if (name) {
        describe(name, function() {
          generateTests(fixture.tests, generator, fixtureMeta);
        });
      } else {
        generateTests(fixture.tests, generator, fixtureMeta);
      }
    } else {
      // Leaf
      generator(name, fixtureMeta);
    }
  });
};
