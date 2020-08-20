'use strict';

const asyncHandler = require('express-async-handler');
var contextGenerator = require('../../web/context-generator');
var fonts = require('../../web/fonts');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');

var WELCOME_MESSAGES = [
  'Code for people',
  'Talk about it',
  "Let's try something new",
  'Computers are pretty cool',
  "Don't build Skynet",
  'Make the world better',
  'Computers need people',
  'Everyone secretly loves robots',
  'Initial commit',
  'Hello World',
  'From everywhere, with love',
  '200 OK',
  'UDP like you just dont care',
  'Lovely code for lovely people',
  "Don't drop your computer",
  'Learn, Teach, Repeat. Always Repeat.',
  'Help out on the projects you love',
  "HTTP 418: I'm a teapot",
  'Hey there, nice to see you',
  'Welcome home'
];

async function renderHomePage(req, res, next) {
  contextGenerator
    .generateBasicContext(req)
    .then(async function(troupeContext) {
      const page = 'userhome-template';

      var osName = req.getParsedUserAgent().os.family.toLowerCase();

      var isLinux = osName.indexOf('linux') >= 0;
      var isOsx = osName.indexOf('mac') >= 0;
      var isWindows = osName.indexOf('windows') >= 0;

      // show everything if we cant confirm the os
      var showOsxApp = !isLinux && !isWindows;
      var showWindowsApp = !isLinux && !isOsx;
      var showLinuxApp = !isOsx && !isWindows;

      res.render(
        page,
        await mixinHbsDataForVueLeftMenu(req, {
          bootScriptName: 'router-userhome',
          cssFileName: 'styles/userhome.css',
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          fonts: fonts.getFonts(),
          welcomeMessage: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
          showOsxApp: showOsxApp,
          showWindowsApp: showWindowsApp,
          showLinuxApp: showLinuxApp,
          troupeContext: troupeContext,
          isNativeDesktopApp: troupeContext.isNativeDesktopApp
        })
      );
    })
    .catch(next);
}

module.exports = exports = {
  renderHomePage: asyncHandler(renderHomePage)
};
