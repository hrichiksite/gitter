'use strict';

module.exports = {
  get: function(model, key) {
    return model.get(key);
  },
  at: function(collection, index) {
    return collection.at(index);
  },
  indexOf: function(collection, model) {
    return collection.indexOf(model);
  }
};
