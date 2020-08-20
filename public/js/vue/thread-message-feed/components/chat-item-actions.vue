<script>
import { mapActions, mapGetters, mapState } from 'vuex';
const ChatItemPolicy = require('../../../views/chat/chat-item-policy');
import { BPopover } from 'bootstrap-vue';

export default {
  name: 'ChatItemActions',
  components: { BPopover },
  props: {
    message: {
      type: Object,
      required: true
    },
    useCompactStyles: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters(['isDisplayedRoomAdmin']),
    ...mapState(['user']),
    chatItemPolicy: function() {
      return new ChatItemPolicy(this.message, {
        currentUserId: this.user.id,
        isTroupeAdmin: this.isDisplayedRoomAdmin
      });
    },
    chatActionsId: function() {
      return `chat-actions-${this.message.id}`;
    },
    actionItems: function() {
      const { message, chatItemPolicy } = this;
      return [
        {
          label: 'Quote',
          slug: 'quote',
          enabled: !!message.id, // is persisted
          action: () => this.quoteMessage(message)
        },
        {
          label: 'Edit',
          slug: 'edit',
          enabled: chatItemPolicy.canEdit(),
          action: () => this.editMessage(message)
        },
        {
          label: 'Delete',
          slug: 'delete',
          enabled: chatItemPolicy.canDelete(),
          action: () => this.deleteMessage(message)
        },
        {
          label: 'Report',
          slug: 'report',
          enabled: chatItemPolicy.canReport(),
          action: () => this.reportMessage(message)
        }
      ];
    }
  },

  methods: {
    ...mapActions({
      quoteMessage: 'threadMessageFeed/quoteMessage',
      deleteMessage: 'threadMessageFeed/deleteMessage',
      reportMessage: 'threadMessageFeed/reportMessage',
      editMessage: 'threadMessageFeed/editMessage'
    }),
    closePopover() {
      // "report" and "failed delete" actions don't change
      // the parent component or focuses other element so
      // we need to close the popover manually
      this.$refs.actionsPopover.$emit('close');
    }
  }
};
</script>

<template>
  <div class="chat-item__actions">
    <b-popover
      ref="actionsPopover"
      :target="chatActionsId"
      triggers="click blur"
      delay="0"
      placement="left"
      title=""
      custom-class="chat-item-actions-popover"
    >
      <div v-for="actionItem in actionItems" :key="actionItem.slug">
        <button
          v-if="actionItem.enabled"
          :class="`popover-item__action js-chat-item-${actionItem.slug}-action`"
          :title="`${actionItem.label} this message`"
          @click="
            actionItem.action();
            closePopover();
          "
        >
          {{ actionItem.label }}
        </button>
        <div v-else class="popover-item__action-disabled">
          {{ actionItem.label }}
        </div>
      </div>
    </b-popover>
    <button
      :id="chatActionsId"
      ref="actionButton"
      class="chat-item-actions-button"
      @click="$refs.actionButton.focus()"
    >
      <i class="chat-item__icon icon-ellipsis"></i>
    </button>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';

.remove-button-styles {
  border: none;
  background: inherit;
  color: inherit;
  line-height: inherit;
  font-size: inherit;
  &:focus {
    outline: 0;
  }
}
.chat-item-actions-button {
  .remove-button-styles();
  padding: 0px;
  &:focus {
    .chat-item__icon {
      visibility: visible;
      color: @blue;
    }
  }
}
.chat-item-actions-popover::v-deep .popover-body {
  width: 70px;
}
.popover-item__action {
  .remove-button-styles();
  width: 100%;
  text-align: left;
  &:hover {
    background: #08c;
    color: white;
  }
}
</style>
