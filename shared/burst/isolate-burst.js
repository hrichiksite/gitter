'use strict';

/**
 * Isolate a burst, given a model and a list of models
 */
function findBurstModels(_, collection, model) {
  var startIndex = _.indexOf(collection, model);
  var endIndex = startIndex + 1;
  var result = [model];
  var i;

  if (startIndex < 0) return result;

  if (!_.get(model, 'burstStart')) {
    startIndex--;

    i = _.at(collection, startIndex);
    while (startIndex >= 0) {
      result.unshift(i);
      if (_.get(i, 'burstStart')) break; // Quit the loop
      startIndex--;

      if (startIndex >= 0) {
        i = _.at(collection, startIndex);
      }
    }
  }

  while (
    endIndex < collection.length &&
    (i = _.at(collection, endIndex)) &&
    !_.get(i, 'burstStart')
  ) {
    result.push(i);
    endIndex++;
  }

  return result;
}

module.exports = findBurstModels;
