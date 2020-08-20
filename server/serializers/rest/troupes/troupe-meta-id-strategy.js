'use strict';

const _ = require('lodash');

const roomMetaService = require('gitter-web-rooms/lib/room-meta-service');

class TroupeMetaIdStrategy {
  static get name() {
    return 'TroupeMetaIdStrategy';
  }

  async preload(ids) {
    const allMeta = await roomMetaService.findMetaByTroupeIds(ids.toArray());
    this.metaByTroupeId = _.indexBy(allMeta, 'troupeId');
  }

  map(id) {
    const meta = this.metaByTroupeId[id] || {};
    return {
      welcomeMessage: meta.welcomeMessage
    };
  }
}

module.exports = TroupeMetaIdStrategy;
