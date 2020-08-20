'use strict';

var Handlebars = require('handlebars/runtime').default;
var cdn = require('gitter-web-cdn');
var Widget = require('./widget');
var avatarImgSrcSetHbsHelper = require('gitter-web-avatars/shared/avatar-img-srcset-hbs-helper');
const sanitizeHref = require('gitter-web-templates/shared/helpers/sanitize-href');

Handlebars.registerHelper('cdn', cdn);
Handlebars.registerHelper('widget', Widget);
Handlebars.registerHelper('avatarSrcSet', avatarImgSrcSetHbsHelper);
Handlebars.registerHelper('sanitizeHref', sanitizeHref);
