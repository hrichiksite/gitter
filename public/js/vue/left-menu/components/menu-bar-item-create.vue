<script>
import MenuBarItem from './menu-bar-item.vue';

import Marionette from 'backbone.marionette';
import Popover from '../../../views/popover';
import actionsTemplate from '../../../views/chat/tmpl/actionsView.hbs';

const ActionsView = Marionette.ItemView.extend({
  template: actionsTemplate,
  initialize: function(options) {
    this.chatItemView = options.chatItemView;
  },
  events: {
    'click .js-chat-action-create-group': 'createGroup',
    'click .js-chat-action-create-room': 'createRoom'
  },

  createGroup: function() {
    window.location.hash = '#createcommunity';
  },

  createRoom: function() {
    window.location.hash = '#createroom';
  },

  serializeData: function() {
    const data = {
      actions: [
        { name: 'create-group', description: 'Create community' },
        { name: 'create-room', description: 'Create room' }
      ]
    };

    return data;
  }
});

const CreatePopover = Popover.extend({
  initialize: function() {
    Popover.prototype.initialize.apply(this, arguments);
    this.view = new ActionsView({});
  },
  events: {
    click: 'hide'
  }
});

export default {
  name: 'MenuBarItemCreate',
  extends: MenuBarItem,

  methods: {
    onClick() {
      this.popover = new CreatePopover({
        targetElement: this.$refs.root,
        placement: 'horizontal'
      });

      this.popover.show();
    }
  }
};
</script>
