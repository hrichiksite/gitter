'use strict';

var persistence = require('gitter-web-persistence');
var assert = require('assert');
var securityDescriptorValidator = require('../security-descriptor-validator');
var securityDescriptorWriteValidator = require('../security-descriptor-write-validator');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var transform = require('./transform');
var StatusError = require('statuserror');
var User = require('gitter-web-persistence').User;

function SecurityDescriptorService(Model) {
  this.Model = Model;
}

SecurityDescriptorService.prototype.findById = function(id, userId) {
  var projection = {
    _id: 0,
    'sd.type': 1,
    'sd.members': 1,
    'sd.admins': 1,
    'sd.public': 1,
    'sd.linkPath': 1,
    'sd.externalId': 1,
    'sd.internalId': 1
  };

  if (userId) {
    // For legacy reasons, bans hang off the base object (for now)
    projection['bans'] = {
      $elemMatch: {
        userId: userId
      }
    };
    // TODO: selectively elemMath var elemMatch = { $elemMatch: { $eq: userId } };
    projection['sd.extraMembers'] = 1;
    projection['sd.extraAdmins'] = 1;
    projection['providers'] = 1;
  }

  return this.Model.findById(id, projection, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd) return null; // TODO: throw 404?
      const sd = doc.sd;
      if (doc.bans) {
        // Move the bans onto sd
        sd.bans = doc.bans;
      }
      if (doc.providers) {
        // TODO: move providers onto sd
        sd.providers = doc.providers;
      }
      securityDescriptorValidator(sd);
      return sd;
    });
};

SecurityDescriptorService.prototype.findByIdAll = function(id) {
  var projection = {
    _id: 0,
    sd: 1,
    bans: 1,
    providers: 1
  };

  return this.Model.findById(id, projection, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd) return null; // TODO: throw 404?
      const sd = doc.sd;
      if (doc.bans) {
        // Move the bans onto sd
        sd.bans = doc.bans;
      }
      if (doc.providers) {
        // TODO: move providers onto sd
        sd.providers = doc.providers;
      }
      securityDescriptorValidator(sd);
      return sd;
    });
};

SecurityDescriptorService.prototype.findByIdsSelect = function(ids, select) {
  var projection = {
    _id: 1
  };

  Object.keys(select).forEach(function(key) {
    projection['sd.' + key] = select[key];
  });

  return this.Model.find({ _id: { $in: ids } }, projection, { lean: true }).exec();
};

SecurityDescriptorService.prototype.findExtraAdmins = function findExtraAdminsForModel(id) {
  return this.Model.findById(id, { _id: 0, 'sd.extraAdmins': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraAdmins) return [];
      return doc.sd.extraAdmins;
    });
};

SecurityDescriptorService.prototype.findExtraMembers = function findExtraMembersForModel(id) {
  return this.Model.findById(id, { _id: 0, 'sd.extraMembers': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraMembers) return [];
      return doc.sd.extraMembers;
    });
};

SecurityDescriptorService.prototype.addExtraAdmin = function(id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return checkUsersValid([userId])
    .bind(this)
    .then(function() {
      return this.Model.update(
        { _id: id },
        {
          $addToSet: {
            'sd.extraAdmins': userId
          }
        },
        {
          new: false,
          select: {
            _id: 0,
            'sd.extraAdmins': 1
          }
        }
      ).exec();
    })
    .then(function(result) {
      return result && result.nModified === 1;
    });
};

SecurityDescriptorService.prototype.removeExtraAdmin = function(id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return this.Model.update(
    { _id: id },
    {
      $pullAll: {
        'sd.extraAdmins': [userId]
      }
    },
    {
      new: false,
      select: {
        _id: 0,
        'sd.extraAdmins': 1
      }
    }
  )
    .exec()
    .then(function(result) {
      return result && result.nModified === 1;
    });
};

SecurityDescriptorService.prototype.updateSecurityDescriptor = function(id, sd) {
  securityDescriptorWriteValidator(sd);

  return this.Model.findByIdAndUpdate(
    id,
    {
      $set: {
        'sd.type': sd.type,
        'sd.members': sd.members,
        'sd.admins': sd.admins,
        'sd.public': sd.public,
        'sd.linkPath': sd.linkPath,
        'sd.externalId': sd.externalId,
        'sd.internalId': sd.internalId,
        'sd.extraMembers': sd.extraMembers,
        'sd.extraAdmins': sd.extraAdmins
      }
    },
    {
      setDefaultsOnInsert: false,
      runValidators: false,
      upsert: false,
      new: true
    }
  )
    .exec()
    .then(function(doc) {
      return doc && doc.sd;
    });
};

function checkUsersValid(userIds) {
  return User.count({ _id: { $in: userIds } }).then(function(count) {
    if (count !== userIds.length) {
      throw new StatusError(400, 'Invalid user');
    }
  });
}

function validateExtraAdmins(existingType, newType, extraAdmins) {
  if (newType === undefined) {
    if (existingType === null) {
      if (!extraAdmins.length) throw new StatusError(400, 'Cannot have an empty extraAdmins list');
    }
  } else {
    if (newType === null) {
      if (!extraAdmins.length) throw new StatusError(400, 'Cannot have an empty extraAdmins list');
    }
  }

  if (!extraAdmins.length) return;

  // Are all the users valid users?
  return checkUsersValid(extraAdmins);
}

SecurityDescriptorService.prototype.update = function(id, update, options) {
  // Check for null update
  if (!update.extraAdmins && update.type === undefined) {
    throw new StatusError(400, 'Invalid update');
  }

  return this.findByIdAll(id)
    .bind(this)
    .tap(function(sd) {
      // Before we make any changes,
      // validate the update
      if (update.extraAdmins) {
        return validateExtraAdmins(sd, update.type, update.extraAdmins);
      }
    })
    .then(function(sd) {
      if (update.type === undefined) return sd;

      return transform(this.Model, sd, update.type, options);
    })
    .then(function(newSd) {
      if (update.extraAdmins) {
        newSd.extraAdmins = mongoUtils.asObjectIDs(update.extraAdmins);
      }

      return this.updateSecurityDescriptor(id, newSd);
    });
};

module.exports = {
  room: new SecurityDescriptorService(persistence.Troupe),
  group: new SecurityDescriptorService(persistence.Group)
};
