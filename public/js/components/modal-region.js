'use strict';

module.exports = {
  currentView: null,
  show: function(view) {
    if (this.currentView) {
      var cv = this.currentView;
      cv.hideInternal();
    }
    this.currentView = view;
    view.navigable = true;
    view.show();

    this.currentView.listenTo(this.currentView, 'hide-modal', this.destroy.bind(this));
  },

  destroy: function() {
    if (this.currentView) {
      this.currentView.navigationalHide();
      this.currentView = null;
    }
  }
};
