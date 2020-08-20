'use strict';

var passiveEventListener = require('../utils/passive-event-listener');
var rafUtils = require('../utils/raf-utils');
var onReady = require('../utils/onready');

function EyeballsFocus(callback) {
  var focusFrames = [document.hasFocus()];

  var evaluateFocusBlur = rafUtils.debounce(function() {
    var hasFocus = focusFrames.some(function(x) {
      return x;
    });

    if (hasFocus) {
      callback(true);
    } else {
      callback(false);
    }
  });

  /* Focus and blur */
  function makeFocusHandler(index) {
    return function() {
      focusFrames[index] = true;
      evaluateFocusBlur();
    };
  }

  function makeBlurHandler(index) {
    return function() {
      focusFrames[index] = false;
      evaluateFocusBlur();
    };
  }

  // Add listeners to the base window
  passiveEventListener.addEventListener(window, 'focus', makeFocusHandler(0));
  passiveEventListener.addEventListener(window, 'blur', makeBlurHandler(0));

  function monitorIFrame(frame) {
    var contentWindow = frame.contentWindow;
    var focused = contentWindow.document.hasFocus();
    var newLength = focusFrames.push(focused);
    var index = newLength - 1;

    var focusHandler = makeFocusHandler(index);
    var blurHandler = makeBlurHandler(index);

    passiveEventListener.addEventListener(contentWindow, 'focus', focusHandler);
    passiveEventListener.addEventListener(contentWindow, 'blur', blurHandler);

    function unloadHandler() {
      // Stop listening during the iframe load
      if (!contentWindow) return;
      passiveEventListener.removeEventListener(contentWindow, 'focus', focusHandler);
      passiveEventListener.removeEventListener(contentWindow, 'blur', blurHandler);
      passiveEventListener.removeEventListener(contentWindow, 'unload', unloadHandler);
      contentWindow = null;
    }

    passiveEventListener.addEventListener(contentWindow, 'unload', unloadHandler);

    passiveEventListener.addEventListener(frame, 'load', function() {
      // Start listening after the iframe load
      if (contentWindow === frame.contentWindow) return;
      contentWindow = frame.contentWindow;
      passiveEventListener.addEventListener(contentWindow, 'focus', focusHandler);
      passiveEventListener.addEventListener(contentWindow, 'blur', blurHandler);
      passiveEventListener.addEventListener(contentWindow, 'unload', unloadHandler);

      var focused = contentWindow.document.hasFocus();
      focusFrames[index] = focused;
      evaluateFocusBlur();
    });
  }

  onReady(function() {
    // Find all iframes and monitor them
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      monitorIFrame(frame);
    }

    evaluateFocusBlur();
  });
}

module.exports = EyeballsFocus;
