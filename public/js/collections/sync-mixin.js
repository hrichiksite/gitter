'use strict';

var apiClient = require('../components/api-client');
var syncMixinFactory = require('gitter-web-api-client/lib/sync-mixin-factory');

/**
 * Singleton Sync Mixin
 */
var SyncMixin = syncMixinFactory(apiClient);

module.exports = SyncMixin;
