'use strict';

function MenuBuilder() {
  /* Treat the top of the menu like a divider */
  this.lastItemDivider = true;
  this.items = [];
}

MenuBuilder.prototype = {
  addConditional: function(conditional, item) {
    if (conditional) {
      this.add(item);
    }
  },

  add: function(item) {
    this.lastItemDivider = false;
    this.items.push(item);
  },

  addDivider: function() {
    /* Add a divider if theres not already one at the bottom */
    if (this.lastItemDivider) return;
    this.lastItemDivider = true;
    this.items.push({ divider: true });
  },

  getItems: function() {
    /* Don't leave a hanging divider at the bottom */
    if (this.lastItemDivider) {
      this.items.pop();
    }

    return this.items;
  }
};

module.exports = MenuBuilder;
