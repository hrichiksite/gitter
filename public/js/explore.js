'use strict';

require('./utils/font-setup');

var appEvents = require('./utils/appevents');
var onready = require('./utils/onready');
var toggleClass = require('./utils/toggle-class');
var ExploreView = require('./views/explore/explore-view');

require('./utils/tracking');

require('@gitterhq/styleguide/css/components/buttons.css');
require('@gitterhq/styleguide/css/components/headings.css');

onready(function() {
  new ExploreView({
    el: '.explore-page-wrap'
  });
  //exploreView.render();

  var tagPillElements = document.querySelectorAll('.js-explore-tag-pill');
  var roomCardElements = document.querySelectorAll('.js-explore-room-card');
  var showMoreElemnts = document.querySelectorAll('.js-explore-show-more-tag-pills');
  var tagPillListElements = document.querySelectorAll('.js-explore-tag-pills-list');

  Array.prototype.forEach.call(roomCardElements, function(roomItemElement) {
    roomItemElement.addEventListener('click', function() {
      // Tracking
      appEvents.trigger('track-event', 'explore_room_click');
    });
  });

  var activeClass = 'is-active';

  var updateRoomCardListVisibility = function() {
    // Grab the active tags
    var activeTags = {};
    Array.prototype.filter
      .call(tagPillElements, function(tagPillElement) {
        return tagPillElement.classList.contains(activeClass);
      })
      .forEach(function(tagPillElement) {
        (tagPillElement.getAttribute('data-tags') || '').split(',').forEach(function(tag) {
          activeTags[tag] = true;
        });
      });

    Array.prototype.forEach.call(roomCardElements, function(roomItemElement) {
      (roomItemElement.getAttribute('data-tags') || '').split(',').some(function(roomTag) {
        var hasActiveTag = activeTags[roomTag];
        toggleClass(roomItemElement, 'is-hidden', !hasActiveTag);
        return hasActiveTag;
      });
    });
  };
  // Initially call it
  updateRoomCardListVisibility();

  /* * /
  // Hook up our pills to update the card list
  var toggleTagPillActive = function(el, state) {
    toggleClass(el, activeClass, state);
    el.setAttribute('aria-selected', state);
  }
  Array.prototype.forEach.call(tagPillElements, function(tagPillElement) {
    tagPillElement.addEventListener('click', function() {
      // Redirect to new page (we don't have a API to query client-side yet)
      //window.location.href = tagPillElement.getAttribute('href');

      // Only one tag can be selected at a time so
      // unselect all of the tags
      Array.prototype.forEach.call(tagPillElements, function(tagPillElement) {
        toggleTagPillActive(tagPillElement, false);
      });
      // Select the tag we just clicked
      toggleTagPillActive(tagPillElement, true);

      updateRoomCardListVisibility();

      // Tracking
      appEvents.trigger('track-event', 'explore_pills_click', {
        tag: tagPillElement.textContent.toLowerCase()
      });
    });
  });
  /* */

  // Expand/Collapse tag pill list
  Array.prototype.forEach.call(showMoreElemnts, function(showMoreElement) {
    showMoreElement.addEventListener('click', function() {
      var state = toggleClass(showMoreElement, 'is-expanded');

      Array.prototype.forEach.call(tagPillListElements, function(pillListElement) {
        toggleClass(pillListElement, 'is-expanded', state);
        pillListElement.setAttribute('aria-selected', state);
      });
    });
  });
});
