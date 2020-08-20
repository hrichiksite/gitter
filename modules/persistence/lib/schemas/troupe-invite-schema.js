'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

module.exports = {
  install: function(mongooseConnection) {
    var TroupeInviteSchema = new Schema(
      {
        troupeId: { type: ObjectId, required: true },
        type: { type: String, enum: ['email', 'github', 'twitter', 'gitlab'], required: true },
        emailAddress: { type: String, required: true },
        externalId: { type: String, required: true },
        // This is used when the invite is accepted/rejected
        userId: { type: ObjectId, required: false },
        invitedByUserId: { type: ObjectId },
        secret: { type: String },
        state: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], required: true },
        reminderSent: { type: Date, required: false }
      },
      { strict: 'throw' }
    );

    TroupeInviteSchema.schemaTypeName = 'TroupeInviteSchema';

    TroupeInviteSchema.index({ troupeId: 1 });
    TroupeInviteSchema.index({ type: 1, externalId: 1 });
    TroupeInviteSchema.index({ userId: 1 });
    TroupeInviteSchema.index({ invitedByUserId: 1 });
    TroupeInviteSchema.index({ secret: 1 }, { unique: true, sparse: true });
    TroupeInviteSchema.index({ reminderSent: 1 }); // Prevent table scans on finding emails that need reminders sent out

    // Only allow a single pending invite
    // per external id
    TroupeInviteSchema.extraIndices = [
      {
        keys: {
          troupeId: 1,
          type: 1,
          externalId: 1
        },
        options: {
          background: true,
          unique: true,
          partialFilterExpression: {
            state: 'PENDING'
          }
        }
      }
    ];

    var TroupeInvite = mongooseConnection.model('TroupeInvite', TroupeInviteSchema);

    return {
      model: TroupeInvite,
      schema: TroupeInviteSchema
    };
  }
};
