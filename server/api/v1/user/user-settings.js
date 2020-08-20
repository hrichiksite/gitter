'use strict';

var userSettingsMuxer = require('../../../services/user-settings-muxer');

module.exports = {
  id: 'userSetting',

  show: function(req) {
    var settingsKey = req.params.userSetting;
    var user = req.resourceUser;

    var settings = settingsKey.split(/,/);

    if (settings.length === 1) {
      return userSettingsMuxer.getSetting(user, settingsKey);
    } else {
      return userSettingsMuxer.getSettings(user, settingsKey.split(','));
    }
  },

  create: function(req) {
    var valuesHash = req.body;
    var user = req.resourceUser;
    return userSettingsMuxer.updateSettings(user, valuesHash);
  },

  update: function(req) {
    var value = req.body;
    var user = req.resourceUser;
    var settingsKey = req.params.userSetting;

    return userSettingsMuxer.updateSetting(user, settingsKey, value);
  },

  respond: function(req, res, responseBody) {
    switch (req.accepts(['json', 'text'])) {
      case 'json':
        res.send(responseBody);
        break;

      default:
        res.sendStatus(200);
        break;
    }
  }
};
