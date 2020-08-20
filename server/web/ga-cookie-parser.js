'use strict';

module.exports = function gaCookieParser(req) {
  // checking for existent UUID
  if (!req.cookies || !req.cookies._ga) return;
  var gaCookie = String(req.cookies._ga);

  return gaCookie
    .split('.')
    .slice(2, 4)
    .join('.');
};
