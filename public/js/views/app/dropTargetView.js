'use strict';

var _ = require('lodash');

var context = require('gitter-web-client-context');
var Marionette = require('backbone.marionette');
var appEvents = require('../../utils/appevents');
var apiClient = require('../../components/api-client');

require('transloadit');

var PROGRESS_THRESHOLD = 62.5;

function contains(domStringsList, item) {
  if (!domStringsList) return false;
  for (var i = 0; i < domStringsList.length; i++) {
    if (domStringsList[i] === item) return true;
  }
  return false;
}

function ignoreEvent(e) {
  e.stopPropagation();
  e.preventDefault();
}

var DropTargetView = Marionette.ItemView.extend({
  template: false,
  el: 'body',
  ui: {
    progressBar: '#file-progress-bar',
    dragOverlay: '.js-drag-overlay',
    uploadForm: '#upload-form'
  },

  events: {
    paste: 'handlePaste',
    dragenter: 'onDragEnter',
    dragleave: 'onDragLeave',
    dragover: 'onDragOver',
    drop: 'onDrop'
  },

  /**
   * IMPORTANT: when dragging moving over child nodes will cause dragenter and dragleave, so we need to keep this count, if it's zero means that we should hide the overlay. WC.
   */
  dragCounter: 0,

  updateProgressBar: function(spec) {
    var bar = this.ui.progressBar;
    var value = spec.value && spec.value.toFixed(0) + '%';
    var timeout = spec.timeout || 200;
    setTimeout(function() {
      bar.css('width', value);
    }, timeout);
  },

  resetProgressBar: function() {
    this.ui.progressBar.hide();
    this.updateProgressBar({
      value: 0,
      timeout: 0
    });
  },

  handleUploadProgress: function(done, expected) {
    this.updateProgressBar({
      value: PROGRESS_THRESHOLD + (done / expected) * (100 - PROGRESS_THRESHOLD),
      timeout: 0
    });
  },

  handleUploadStart: function() {
    this.ui.progressBar.show();
  },

  handleUploadSuccess: function(res) {
    this.resetProgressBar();
    var n = parseInt(res.fields.numberOfFiles, 10);
    appEvents.triggerParent('user_notification', {
      title: 'Upload complete',
      text: (n > 1 ? n + ' files' : 'file') + ' uploaded successfully.'
    });
  },

  handleUploadError: function(err) {
    appEvents.triggerParent('user_notification', {
      title: 'Error Uploading File',
      text: err.message
    });
    this.resetProgressBar();
  },

  isTextDrag: function(e) {
    var dt = e.dataTransfer;
    if (contains(dt.types, 'Files')) return false;
    if (!dt.files && dt.files.length > 0) {
      return false;
    }

    var items = dt.items;
    if (!items) return true;
    for (var i = 0; i < items.length; i++) {
      var kind = items[i].kind;
      if (kind !== 'string') {
        return false;
      }
    }

    return true;
  },

  onDragEnter: function(e) {
    if (e.originalEvent) e = e.originalEvent;
    if (this.isTextDrag(e)) return;
    this.dragCounter++;
    this.ui.dragOverlay.toggleClass('hide', false);
    ignoreEvent(e);
  },

  onDragLeave: function(e) {
    if (e.originalEvent) e = e.originalEvent;
    if (this.isTextDrag(e)) return;

    this.dragCounter--;
    this.ui.dragOverlay.toggleClass('hide', this.dragCounter === 0);
    ignoreEvent(e);
  },

  onDragOver: function(e) {
    if (e.originalEvent) e = e.originalEvent;
    if (this.isTextDrag(e)) return;
    ignoreEvent(e);
  },

  onDrop: function(e) {
    if (e.originalEvent) e = e.originalEvent;
    if (this.isTextDrag(e)) return;

    this.dragCounter = 0; // reset the counter
    this.ui.dragOverlay.toggleClass('hide', true);
    ignoreEvent(e);

    var files = e.dataTransfer.files;
    this.upload(files);
  },

  isImage: function(file) {
    var fileType = file.type;
    // svg causes an INVALID_FILE_META_DATA error from transloadit.
    // see https://github.com/gitterHQ/gitter/issues/721
    return fileType !== 'image/svg+xml' && fileType.indexOf('image/') >= 0;
  },

  /**
   * handles pasting, image-only for now
   */
  handlePaste: function(evt) {
    evt = evt.originalEvent || evt;
    var clipboard = evt.clipboardData;
    var blob = null;

    if (!clipboard || !clipboard.items) {
      return; // Safari + FF, don't support pasting images in. Ignore and perform default behaviour. WC.
    }

    if (clipboard.items.length === 1) {
      blob = clipboard.items[0].getAsFile();
      if (!blob || !this.isImage(blob)) {
        return;
      } else {
        evt.preventDefault();
        this.upload([blob]);
      }
    }
  },

  // Returns image iff all files are safe for opening in a browser
  // otherwise returns ''
  getFileType: function(files) {
    if (!files.length) return '';

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!this.isImage(file)) {
        return '';
      }
    }
    return 'image';
  },

  upload: function(files) {
    if (!files.length) return;
    var self = this;
    this.ui.progressBar.show();

    this.updateProgressBar({
      value: 0,
      timeout: 0
    });

    this.updateProgressBar({
      value: PROGRESS_THRESHOLD,
      timeout: 200
    });

    var DEFAULT_OPTIONS = {
      wait: true,
      modal: false,
      autoSubmit: false,
      debug: false,
      onStart: this.handleUploadStart.bind(this),
      onProgress: this.handleUploadProgress.bind(this),
      onSuccess: this.handleUploadSuccess.bind(this),
      onError: this.handleUploadError.bind(this)
    };

    var formData = new FormData();

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      formData.append('file', file);
    }

    formData.append('numberOfFiles', files.length);
    apiClient.priv
      .get('/generate-signature', {
        room_id: context.getTroupeId(),
        type: this.getFileType(files)
      })
      .then(function(res) {
        formData.append('signature', res.sig);

        var form = self.ui.uploadForm;
        form.find('input[name="params"]').attr('value', res.params);
        form.unbind('submit.transloadit');
        form.transloadit(_.extend(DEFAULT_OPTIONS, { formData: formData }));
        form.submit();
      });
  }
});

module.exports = DropTargetView;
