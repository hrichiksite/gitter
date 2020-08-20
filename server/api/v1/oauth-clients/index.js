'use strict';

const crypto = require('crypto');
const StatusError = require('statuserror');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const oauthService = require('gitter-web-oauth');
const persistenceService = require('gitter-web-persistence');
const restSerializer = require('../../../serializers/rest-serializer');

module.exports = {
  id: 'oauthClient',

  index: async function(req) {
    const apps = await oauthService.findClientsByOwnerUserId(req.user.id);

    const strategy = new restSerializer.OauthClientStrategy();
    return restSerializer.serialize(apps, strategy);
  },

  create: async function(req) {
    const { name, registeredRedirectUri } = req.body;

    if (!name.match(/\w+/) || !registeredRedirectUri) {
      throw new StatusError(400);
    }

    const safeName = name.toLowerCase().replace(/\W/g, '-');

    const app = {
      name: name,
      registeredRedirectUri: registeredRedirectUri,
      tag: safeName,
      clientKey: crypto.randomBytes(20).toString('hex'),
      clientSecret: crypto.randomBytes(20).toString('hex'),
      ownerUserId: req.user.id,
      canSkipAuthorization: false
    };

    const oauthClient = await persistenceService.OAuthClient.create(app);

    const strategy = new restSerializer.OauthClientStrategy();
    return restSerializer.serializeObject(oauthClient, strategy);
  },

  destroy: async function(req) {
    const oauthClient = req.oauthClient;

    if (!oauthClient) {
      throw new StatusError(404);
    }

    await oauthService.deleteOauthClient(oauthClient);
  },

  load: async function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    const oauthClient = await oauthService.findClientById(id);

    if (!oauthClient) {
      return null;
    }

    if (!mongoUtils.objectIDsEqual(oauthClient.ownerUserId, req.user.id)) {
      throw new StatusError(403, 'OAuth Client owner does not match your user');
    }

    return oauthClient;
  }
};
