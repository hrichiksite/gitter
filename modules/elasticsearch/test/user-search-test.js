'use strict';

var userSearch = require('../lib/user-search');

describe('user-search', function() {
  describe('integration tests #slow', function() {
    describe('searchGlobalUsers', function() {
      it('does not crash', function() {
        return userSearch.searchGlobalUsers('moo', {});
      });
    });

    describe('elasticsearchUserTypeahead', function() {
      it('does not crash', function() {
        return userSearch.elasticsearchUserTypeahead('moo', {});
      });
    });
  });
});
