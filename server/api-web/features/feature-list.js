'use strict';

var persistence = require('gitter-web-persistence');

function listFeatures() {
  return persistence.FeatureToggle.find({}, { name: 1, description: 1, hidden: 1 })
    .lean()
    .exec()
    .then(function(togglesList) {
      return togglesList.map(function(f) {
        return { name: f.name, description: f.description, hidden: f.hidden };
      });
    });
}

module.exports = function(req, res, next) {
  listFeatures()
    .then(function(features) {
      var result = features.map(function(feature) {
        return {
          name: feature.name,
          description: feature.description,
          enabled: req.fflip.has(feature.name),
          hidden: feature.hidden
        };
      });

      res.send(result);
    })
    .catch(next);
};
