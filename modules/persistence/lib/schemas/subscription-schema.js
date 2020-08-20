'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

/*
 * Subscriptions
 */
var SubscriptionSchema = new Schema({
  userId: { type: ObjectId },
  uri: { type: String },
  lcUri: { type: String },
  plan: { type: String },
  subscriptionType: { type: String, required: true, enum: ['USER', 'ORG'] },
  status: { type: String, required: true, enum: ['CURRENT', 'ARCHIVED'], default: 'CURRENT' }
});

SubscriptionSchema.index({ userId: 1 }, { unique: false });
SubscriptionSchema.index({ userId: 1, plan: 1 }, { unique: false });
SubscriptionSchema.index({ userId: 1, subscriptionType: 1, status: 1 }, { unique: false });
SubscriptionSchema.index({ lcUri: 1 }, { unique: true });

SubscriptionSchema.schemaTypeName = 'SubscriptionSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Subscription', SubscriptionSchema);

    return {
      model: model,
      schema: SubscriptionSchema
    };
  }
};
