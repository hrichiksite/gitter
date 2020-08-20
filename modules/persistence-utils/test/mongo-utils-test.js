'use strict';

var assert = require('assert');
var underTest = require('../lib/mongo-utils');
var ObjectID = require('mongodb').ObjectID;
var Promise = require('bluebird');

describe('mongo-utils', function() {
  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time #slow', function(done) {
    function doLater(i) {
      return Promise.delay(i * 10).then(function() {
        var t = underTest.getDateFromObjectId('51adcd412aefe1576f000005');
        assert.equal(t.getTime(), 1370344769000);
      });
    }

    var promises = [];
    for (var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Promise.all(promises).then(function() {
      done();
    }, done);
  });

  // The millisecond value seems to float around in some instances, so this test
  // is designed to be spread out over several milliseconds to test this theory
  it('should return the right time, no matter what the current time #slow', function(done) {
    var id = new ObjectID();
    var t = id.getTimestamp().getTime();

    function doLater(i) {
      return Promise.delay(i * 10).then(function() {
        assert.equal(id.getTimestamp().getTime(), t);
      });
    }

    var promises = [];
    for (var i = 0; i < 10; i++) {
      promises.push(doLater(i));
    }

    Promise.all(promises).then(function() {
      done();
    }, done);
  });

  it('should handle ObjectIDs', function() {
    var id = new ObjectID('51adcd412aefe1576f000005');
    var t = underTest.getTimestampFromObjectId(id);
    assert.equal(t, 1370344769000);
  });

  describe('objectIDsEqual', function() {
    var FIXTURES = [
      // Nulls
      { a: null, b: null, result: true },
      { a: null, b: '', result: true },
      { a: '', b: null, result: true },
      { a: null, b: '571f97883f33e1a227b8ab85', result: false },
      { a: '571f97883f33e1a227b8ab85', b: null, result: false },
      { a: new ObjectID('571f97883f33e1a227b8ab85'), b: null, result: false },
      { a: null, b: new ObjectID('571f97883f33e1a227b8ab85'), result: false },

      // Empty Strings
      { a: '', b: '', result: true },
      { a: '571f97883f33e1a227b8ab85', b: '', result: false },
      { a: '', b: '571f97883f33e1a227b8ab85', result: false },
      { a: new ObjectID('571f97883f33e1a227b8ab85'), b: '', result: false },
      { a: '', b: new ObjectID('571f97883f33e1a227b8ab85'), result: false },

      // Strings
      { a: '571f97883f33e1a227b8ab85', b: '571f97883f33e1a227b8ab85', result: true },
      { a: '571f97883f33e1a227b8ab86', b: '571f97883f33e1a227b8ab85', result: false },

      // ObjectIDS
      { a: '571f97883f33e1a227b8ab85', b: new ObjectID('571f97883f33e1a227b8ab85'), result: true },
      { a: new ObjectID('571f97883f33e1a227b8ab85'), b: '571f97883f33e1a227b8ab85', result: true },
      {
        a: new ObjectID('571f97883f33e1a227b8ab85'),
        b: new ObjectID('571f97883f33e1a227b8ab86'),
        result: false
      }
    ];

    FIXTURES.forEach(function(fixture, index) {
      it('should handle case #' + index, function() {
        var result = underTest.objectIDsEqual(fixture.a, fixture.b);
        assert.strictEqual(result, fixture.result);
      });
    });

    describe('multiple versions of mongodb', function() {
      var PackageDetails = {
        ObjectID: require('mongodb').ObjectID,
        version: 'local'
      };

      var BaseDetails = {
        ObjectID: require('../../../node_modules/mongodb').ObjectID,
        version: require('../../../node_modules/mongodb/package.json').version
      };

      var MongooseDetails = {
        ObjectID: require('mongoose').mongo.ObjectID,
        version: 'mongoose'
      };

      var FIXTURES = [
        { A: PackageDetails, B: PackageDetails },
        { A: BaseDetails, B: BaseDetails },
        { A: MongooseDetails, B: MongooseDetails },
        { A: PackageDetails, B: BaseDetails },
        { A: BaseDetails, B: PackageDetails },
        { A: PackageDetails, B: MongooseDetails },
        { A: MongooseDetails, B: PackageDetails },
        { A: MongooseDetails, B: PackageDetails },
        { A: BaseDetails, B: MongooseDetails },
        { A: MongooseDetails, B: BaseDetails }
      ];

      FIXTURES.forEach(function(fixture, index) {
        /****************************************************
         * Note to the reader:
         * If you are here because of a broken test, please
         * read on....
         *****************************************************
         * This test ensures that mongo.ObjectID.equals works
         * as expected. However, if, after a shrinkwrap this
         * stops working, the most likely reason is that
         * mongoose has started using a new version of the
         * mongodb than what we're using the base package.json
         *
         * To fix the problem:
         * Update the mongodb dependency to match the
         * one being used by mongoose, and also
         * make sure that all submodules that depend on
         * mongodb are also updated
         */
        it('should handle case #' + index, function() {
          var a = new fixture.A.ObjectID('571f97883f33e1a227b8ab85');
          var b = new fixture.B.ObjectID('571f97883f33e1a227b8ab85');
          var nativeResult = a.equals(b);
          assert.strictEqual(
            nativeResult,
            true,
            'Fail from ' + fixture.A.version + ' vs. ' + fixture.B.version
          );
          var result = underTest.objectIDsEqual(a, b);
          assert.strictEqual(result, true);
        });
      });
    });
  });

  describe('isLikeObjectId', function() {
    it('should parse objectIds', function() {
      var id = new ObjectID('51adcd412aefe1576f000005');
      assert(underTest.isLikeObjectId(id));
    });

    it('should parse objectId strings', function() {
      var id = '51adcd412aefe1576f000005';
      assert(underTest.isLikeObjectId(id));
    });

    it('should not parse the string moo', function() {
      var id = 'moo';
      assert(!underTest.isLikeObjectId(id));
    });

    it('should not parse the string undefined', function() {
      var id = 'undefined';
      assert(!underTest.isLikeObjectId(id));
    });

    it('should not parse random hashes', function() {
      var id = { problems_i_have: 99 };
      assert(!underTest.isLikeObjectId(id));
    });
  });

  describe('serializeObjectId', function() {
    it('should serialise objectIds', function() {
      var id = new ObjectID('51adcd412aefe1576f000005');
      assert.equal('51adcd412aefe1576f000005', underTest.serializeObjectId(id));
    });

    it('should serialise strings', function() {
      var id = '51adcd412aefe1576f000005';
      assert.equal('51adcd412aefe1576f000005', underTest.serializeObjectId(id));
    });

    it('should serialise nulls', function() {
      var id = null;
      assert.equal(null, underTest.serializeObjectId(id));
    });
  });

  describe('conjunctionIds', function() {
    var id1, id2, id3, id4, id5, id6;

    before(function() {
      id1 = new ObjectID('51adcd412aefe1576f000005');
      id2 = new ObjectID('51adcd412aefe1576f000006');
      id3 = new ObjectID('51adcd412aefe1576f000007');
      id4 = new ObjectID('51adcd412aefe1576f000008');
      id5 = new ObjectID('51adcd412aefe1576f000009');
      id6 = new ObjectID('51adcd412aefe1576f00000a');
    });

    it('should deal with sets with less than three items', function() {
      var result = underTest.conjunctionIds([{ x: id1, y: id2 }, { x: id1, y: id3 }], ['x', 'y']);
      assert.deepEqual(result, { $or: [{ x: id1, y: id2 }, { x: id1, y: id3 }] });
    });

    it('should deal with sets where the first item is unique', function() {
      var result;
      for (var i = 0; i < 100000; i++) {
        result = underTest.conjunctionIds(
          [{ x: id1, y: id2 }, { x: id1, y: id3 }, { x: id1, y: id4 }, { x: id1, y: id5 }],
          ['x', 'y']
        );
      }
      assert.deepEqual(result, { $and: [{ x: id1 }, { y: { $in: [id2, id3, id4, id5] } }] });
    });

    it('should deal with sets where the second item is unique', function() {
      var result = underTest.conjunctionIds(
        [{ x: id2, y: id1 }, { x: id3, y: id1 }, { x: id4, y: id1 }, { x: id5, y: id1 }],
        ['x', 'y']
      );
      assert.deepEqual(result, { $and: [{ y: id1 }, { x: { $in: [id2, id3, id4, id5] } }] });
    });

    it('should deal with sets with no unique items', function() {
      var terms = [{ x: id1, y: id2 }, { x: id3, y: id4 }, { x: id5, y: id6 }, { x: id1, y: id6 }];
      var result = underTest.conjunctionIds(terms, ['x', 'y']);
      assert.deepEqual(result, { $or: terms });
    });
  });

  describe('unionModelsById', function() {
    it('should union nothing', function() {
      var result = underTest.unionModelsById([[], [], []]);
      assert.deepEqual(result, []);
    });

    it('should union disjoint items', function() {
      var result = underTest.unionModelsById([[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]]);
      assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should union overlapping items', function() {
      var result = underTest.unionModelsById([[{ id: 1 }], [{ _id: 1 }], [{ _id: 1 }]]);
      assert.deepEqual(result, [{ id: 1 }]);
    });

    it('should union partially overlapping items - 1', function() {
      var result = underTest.unionModelsById([[{ id: 1 }], [{ _id: 2 }], [{ _id: 1 }]]);
      assert.deepEqual(result, [{ id: 1 }, { _id: 2 }]);
    });
    it('should union partially overlapping items - 2', function() {
      var result = underTest.unionModelsById([[{ id: 2 }], [{ _id: 2 }], [{ _id: 1 }]]);
      assert.deepEqual(result, [{ id: 2 }, { _id: 1 }]);
    });

    it('should union items with nulls', function() {
      var result = underTest.unionModelsById([[{ id: 1 }], null, [{ _id: 1 }]]);
      assert.deepEqual(result, [{ id: 1 }]);
    });
  });
});
