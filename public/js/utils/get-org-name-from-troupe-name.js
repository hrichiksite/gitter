'use strict';

var assert = require('assert');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');

describe('Get an org name from a room name', function() {
  it('should return the org name if only the org name is passed', function() {
    var expected = 'gitterHQ';
    var actual = getOrgNameFromTroupeName('gitterHQ');
    assert.equal(expected, actual);
  });

  it('should get an org name if a uri is passed', function() {
    var expected = 'gitterHQ';
    var actual = getOrgNameFromTroupeName('gitterHQ/sidecar');
    assert.equal(expected, actual);
  });
});
