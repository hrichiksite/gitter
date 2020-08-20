'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');
var securityDescriptor = require('./security-descriptor-subdocument');

module.exports = {
  install: function(mongooseConnection) {
    //
    // Banned from the room
    //
    var TroupeBannedUserSchema = new Schema({
      userId: { type: ObjectId },
      dateBanned: { type: Date, default: Date.now },
      bannedBy: { type: ObjectId }
    });
    TroupeBannedUserSchema.schemaTypeName = 'TroupeBannedUserSchema';
    var TroupeBannedUser = mongooseConnection.model('TroupeBannedUser', TroupeBannedUserSchema);

    //
    // User in a Troupe
    //
    var TroupeOneToOneUserSchema = new Schema({
      userId: { type: ObjectId }
    });
    TroupeOneToOneUserSchema.schemaTypeName = 'TroupeOneToOneUserSchema';

    //
    // A Troupe
    //
    var TroupeSchema = new Schema(
      {
        groupId: { type: ObjectId, required: false },
        topic: { type: String, default: '' },
        uri: { type: String },
        tags: [String],
        lcUri: {
          type: String,
          default: function() {
            return this.uri ? this.uri.toLowerCase() : null;
          }
        },
        githubType: {
          type: String,
          enum: ['REPO', 'ORG', 'ONETOONE', 'REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL']
        },
        lcOwner: {
          type: String,
          default: function() {
            return this.uri ? this.uri.split('/')[0].toLowerCase() : null;
          }
        },
        status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' }, // DEPRECATED. TODO: remove this
        oneToOne: { type: Boolean, default: false },
        oneToOneUsers: [TroupeOneToOneUserSchema],
        /** Note: USER COUNT MAY NOT BE UP TO DATE. ONLY USE IT FOR QUERIES, NOT FOR ITERATION ETC. */
        userCount: {
          type: Number,
          default: function() {
            return this.oneToOne ? 2 : 0;
          }
        },
        bans: [TroupeBannedUserSchema],
        parentId: { type: ObjectId, required: false },
        ownerUserId: { type: ObjectId, required: false }, // For channels under a user /suprememoocow/custom
        security: {
          type: String /* WARNING: validation bug in mongo 'enum': ['PRIVATE', 'PUBLIC', 'INHERITED'], required: false */
        }, // For REPO_CHANNEL, ORG_CHANNEL, USER_CHANNEL
        dateDeleted: { type: Date },
        dateLastSecurityCheck: { type: Date },
        noindex: { type: Boolean, default: false },
        githubId: { type: Number, default: null },
        lang: { type: String }, // Human language of this room
        renamedLcUris: [String],
        // Used to restrict access to certain kind of users (ex. GitHub only rooms)
        // Eventually, we want to move this to the security descriptor
        providers: [String],
        sd: { type: securityDescriptor.Schema, required: false },
        _tv: { type: 'MongooseNumber', default: 0 }
      },
      { strict: 'throw' }
    );

    TroupeSchema.schemaTypeName = 'TroupeSchema';

    TroupeSchema.path('security').validate(function(value) {
      return !value || value === 'PRIVATE' || value === 'PUBLIC' || value === 'INHERITED';
    }, 'Invalid security');

    TroupeSchema.index({ groupId: 1 });
    // Ideally we should never search against URI, only lcURI
    TroupeSchema.index({ uri: 1 }, { unique: true, sparse: true });
    TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });
    TroupeSchema.index(
      { githubId: 1 },
      {
        /* NB we cannot make this unique as there may be duplicates in existing data unfortunately */
      }
    );
    TroupeSchema.index({ renamedLcUris: 1 });
    TroupeSchema.index({ parentId: 1 });
    TroupeSchema.index({ lcOwner: 1 });
    TroupeSchema.index({ ownerUserId: 1 });
    TroupeSchema.index({ lcUri: 1 }, { unique: true, sparse: true });

    TroupeSchema.index({ 'oneToOneUsers.userId': 1 });

    TroupeSchema.extraIndices = [
      {
        keys: {
          tags: 1,
          // interesting: we have to include sd.public here even though it is
          // always going to be true otherwise mongo complains
          //Error: key sd.public must not contain '.'
          'sd.public': 1
        },
        options: {
          background: true,
          partialFilterExpression: {
            'sd.public': { $eq: true }
          }
        }
      }
    ];

    installVersionIncMiddleware(TroupeSchema);

    TroupeSchema.pre('save', function(next) {
      this.lcUri = this.uri ? this.uri.toLowerCase() : undefined;
      next();
    });

    TroupeSchema.methods.addUserBan = function(options) {
      // TODO: add some asserts here
      var ban = new TroupeBannedUser(options);
      this.bans.push(ban);
      return ban;
    };

    var Troupe = mongooseConnection.model('Troupe', TroupeSchema);

    return {
      model: Troupe,
      schema: TroupeSchema
    };
  }
};
