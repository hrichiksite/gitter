'use strict';

var FontFaceObserver = require('fontfaceobserver');
var RAF = require('./raf');
const cookies = require('./cookies');

//We only want to observer events for the default font
var font = new FontFaceObserver('source-sans-pro', {
  weight: 'normal'
});

font.load().then(function() {
  RAF(function() {
    document.documentElement.className += ' fonts-loaded';
    //Store a cookie to say the fonts have been loaded and should be cached
    cookies.set('webfontsLoaded', true);
  });
});
