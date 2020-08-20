'use strict';

var Backbone = require('backbone');
var context = require('gitter-web-client-context');
var validateTag = require('gitter-web-shared/validation/validate-tag').validateTag;

var TagModel = Backbone.Model.extend({
  defaults: {
    value: ''
  },

  //we get an array of tag strings from the server
  //rather than { value: ''  }
  //we need to parse them here
  initialize: function(tag) {
    this.set('value', tag);
  },

  validate: function(attrs) {
    var isStaff = context.isStaff();
    var result = validateTag(attrs.value, isStaff);

    if (result.messages.length > 0) {
      return result.messages.join(' ');
    }
  }
});

var TagCollection = Backbone.Collection.extend({
  model: TagModel,

  addModel: function(model) {
    var val = model.get('value');

    //if there is a duplicate fire error
    if (this.where({ value: val }).length) {
      this.trigger('tag:error:duplicate', val);
    } else {
      this.add(model);
      this.trigger('tag:added', val);
    }
  },

  toJSON: function() {
    return this.reduce(function(memo, model) {
      memo.push(model.get('value'));
      return memo;
    }, []).join(',');
  }
});

module.exports = {
  TagCollection: TagCollection,
  TagModel: TagModel
};
