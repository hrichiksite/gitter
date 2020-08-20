'use strict';

module.exports = function roomListGenerator(troupeCollection) {
  return troupeCollection.map(function(model) {
    var lastAccess = model.get('lastAccessTime');
    lastAccess = +new Date(lastAccess);
    return {
      name: model.get('name'),
      id: model.get('id'),
      lastAccess: lastAccess
    };
  });
};
