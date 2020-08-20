'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var FeatureToggle = new Schema({
  name: String,
  description: String,
  // Hidden from the UI but still accessible via API
  hidden: Boolean,
  criteria: Schema.Types.Mixed
});
FeatureToggle.schemaTypeName = 'FeatureToggle';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('FeatureToggle', FeatureToggle);

    return {
      model: model,
      schema: FeatureToggle
    };
  }
};
