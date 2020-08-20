'use strict';

var hbsHelpers = require('gitter-web-templates/lib/hbs-helpers');
var avatarImgSrcSetHbsHelper = require('gitter-web-avatars/shared/avatar-img-srcset-hbs-helper');

module.exports = function(hbs) {
  Object.keys(hbsHelpers).forEach(function(key) {
    var helper = hbsHelpers[key];
    if (typeof helper !== 'function') return;
    hbs.registerHelper(key, helper);
  });

  hbs.registerHelper('prerenderView', require('./prerender-helper'));
  hbs.registerHelper('chatItemPrerender', require('./prerender-chat-helper'));
  hbs.registerHelper('activityItemPrerender', require('./prerender-activity-helper'));
  hbs.registerHelper('widget', require('./widget-prerenderers').widget);
  hbs.registerHelper('paginate', require('./paginate-helper'));

  hbs.registerHelper('avatarSrcSet', avatarImgSrcSetHbsHelper);
};
