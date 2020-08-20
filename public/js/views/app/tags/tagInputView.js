'use strict';

var Marionette = require('backbone.marionette');
var TagModel = require('../../../collections/tag-collection').TagModel;

var tagInputTemplate = require('./tmpl/tagInputTemplate.hbs');

var ENTER_KEY_CODE = 13;
var BACKSPACE_KEY_CODE = 8;
var DELETE_KEY_CODE = 46;

var TagInputView = Marionette.ItemView.extend({
  template: tagInputTemplate,

  events: {
    submit: 'onTagSubmit',
    input: 'onTagInput',
    keyup: 'onKeyPressed'
  },

  initialize: function() {
    this.model = new TagModel();
    this.bindToModel();
  },

  bindToModel: function() {
    this.stopListening(this.model);
    this.listenTo(this.model, 'invalid', this.onModelInvalid);
    this.listenTo(this.model, 'change', this.onModelChange);
  },

  getTagInputValue: function(e) {
    return e ? e.target.value : this.$el.find('input').val();
  },

  onTagSubmit: function(e) {
    if (e) e.preventDefault();

    // The `testTag` and our actual model should be the same if valid
    // This check is necessary because if there was invalid input
    // our legit model would stop setting the value after seeing it as invalid
    // which would cause extraneous length errors
    var val = this.getTagInputValue();
    var testTag = new TagModel().set('value', val, { silent: true });
    if (testTag.isValid() && this.model.isValid()) {
      // Add the tag we just entered
      this.collection.addModel(this.model);

      // Then reset the text input for the next one
      this.model = new TagModel();
      this.bindToModel();
      this.$el.find('input').val('');
      this.triggerMethod('tag:added');
    }
  },

  onTagInput: function(e) {
    if (e) e.preventDefault();

    //guard against manual invocation of this function
    var val = this.getTagInputValue();
    this.model.set('value', val, { validate: true });
    if (val.length === 0) {
      this.triggerMethod('tag:warning:empty');
    }
  },

  onKeyPressed: function(e) {
    switch (e.keyCode) {
      // Submit tag by pressing enter
      case ENTER_KEY_CODE:
        // manually trigger tag submission
        this.onTagSubmit();
        break;

      // If a user presses (meta+backspace)/delete
      // and the input is empty
      // remove the last tag
      case DELETE_KEY_CODE:
        this.removeLastTag();
        break;

      case BACKSPACE_KEY_CODE:
        if (e.metaKey || e.ctrlKey) {
          this.removeLastTag();
        }

        break;
    }
  },

  removeLastTag: function() {
    var val = this.$el.find('input').val();
    if (val === '') this.collection.pop();
    this.triggerMethod('tag:removed');
  },

  onModelChange: function(model) {
    this.$el.find('input').removeClass('invalid');
    this.triggerMethod('tag:valid', model.get('value'));
  },

  onModelInvalid: function(model, message) {
    this.$el.find('input').addClass('invalid');

    //if the tag is empty we want to show a message not error
    this.triggerMethod('tag:error', message);
  },

  focus: function() {
    this.$el.find('input').focus();
  }
});

module.exports = TagInputView;
