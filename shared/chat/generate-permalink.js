'use strict';

const moment = require('moment');
const urlJoin = require('url-join');
const clientEnv = require('gitter-client-env');

/*
 * Generates absolute URL representing permanent link to a chat item
 *
 * troupeUri - URL segment identifying room (usually community-name/room-name)
 * id - message id
 * sent - date when the message was sent, accepted formats: JavaScript Date, moment
 * isArchive - if true, generated link will point to room archive,
 *             otherwise link points to normal chat
 */
module.exports = (troupeUri, id, sent = null, isArchive = false) => {
  const basePath = clientEnv['basePath'];
  if (isArchive) {
    const urlDate = moment(sent).format('YYYY/MM/DD');
    return urlJoin(basePath, troupeUri, 'archives', urlDate, `?at=${id}`);
  }
  return urlJoin(basePath, troupeUri, `?at=${id}`);
};
