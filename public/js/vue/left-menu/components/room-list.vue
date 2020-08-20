<script>
import _ from 'lodash';
import { pojo as sortsAndFilters } from 'gitter-realtime-client/lib/sorts-filters';
import { mapState, mapActions } from 'vuex';
import draggable from 'vuedraggable';

import ListItem from './list-item.vue';

export default {
  name: 'RoomList',
  components: {
    ListItem,
    draggable
  },
  props: {
    rooms: {
      type: Array,
      required: true
    }
  },
  computed: {
    ...mapState(['isMobile', 'displayedRoomId', 'favouriteDraggingInProgress']),

    favouriteRooms() {
      return this.rooms.filter(sortsAndFilters.favourites.filter);
    },
    normalRooms() {
      return this.rooms.filter(sortsAndFilters.recents.filter);
    },
    favouriteDragDropDisabled() {
      // Disable room favourite drag and drop on mobile so they can scroll the room list
      return this.isMobile;
    }
  },

  methods: {
    ...mapActions(['updatefavouriteDraggingInProgress', 'updateRoomFavourite']),

    dragStart() {
      this.updatefavouriteDraggingInProgress(true);
    },
    dragEnd() {
      this.updatefavouriteDraggingInProgress(false);
    },
    favouriteAdded({ oldIndex: fromNormalIndex, newIndex: toFavouriteIndex }) {
      const itemBeingAdded = this.normalRooms[fromNormalIndex];
      this.moveFavouriteToIndex(itemBeingAdded, Infinity, toFavouriteIndex);
    },
    favouriteRemoved({ oldIndex: fromFavouriteIndex }) {
      const itemBeingRemoved = this.favouriteRooms[fromFavouriteIndex];
      this.updateRoomFavourite({ id: itemBeingRemoved.id, favourite: false });
    },
    favouriteMoved({ oldIndex: fromFavouriteIndex, newIndex: toFavouriteIndex }) {
      const itemBeingMoved = this.favouriteRooms[fromFavouriteIndex];
      this.moveFavouriteToIndex(itemBeingMoved, fromFavouriteIndex, toFavouriteIndex);
    },

    moveFavouriteToIndex(itemBeingMoved, oldIndex, newIndex) {
      const maxRoom = _.max(this.favouriteRooms, 'favourite');

      let displacedSibling;
      // Moving item up in the list
      if (oldIndex > newIndex) {
        displacedSibling = this.favouriteRooms[newIndex];
      }
      // Otherwise item moving down in the list
      else {
        // We need to increment by 1 because the itemBeingMoved is still taking space in favouriteRooms
        // but we want to get the index of a room as if itemBeingMoved was not present in the list anymore
        displacedSibling = this.favouriteRooms[newIndex + 1];
      }

      let favourite;
      // If there is a displacedSibling, then take it's position
      if (displacedSibling) {
        favourite = displacedSibling.favourite;
      } else {
        favourite = ((maxRoom && maxRoom.favourite) || 0) + 1;
      }

      this.updateRoomFavourite({ id: itemBeingMoved.id, favourite });
    }
  }
};
</script>

<template>
  <div>
    <draggable
      ref="favourite-draggable"
      tag="ul"
      class="favourite-room-list"
      :class="{ 'is-dragging': favouriteDraggingInProgress }"
      :disabled="favouriteDragDropDisabled"
      group="rooms"
      @start="dragStart"
      @end="dragEnd"
      @add="favouriteAdded"
      @remove="favouriteRemoved"
      @update="favouriteMoved"
    >
      <list-item
        v-for="room in favouriteRooms"
        :key="room.id"
        :item="room"
        :active="room.id === displayedRoomId"
      />
    </draggable>

    <draggable
      tag="ul"
      class="room-list"
      :disabled="favouriteDragDropDisabled"
      group="rooms"
      @start="dragStart"
      @end="dragEnd"
    >
      <list-item
        v-for="room in normalRooms"
        :key="room.id"
        :item="room"
        :active="room.id === displayedRoomId"
      />
    </draggable>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'colors';
@import (reference) 'dark-theme';

.favourite-room-list,
.room-list {
  margin-left: 0;
  margin-bottom: 0;
  list-style: none;
}

.favourite-room-list {
  position: relative;

  &:before {
    content: '';

    position: absolute;
    top: 0;
    left: (@desktop-menu-left-padding / 2);
    right: 0;
    bottom: 0;

    display: inline-block;
    pointer-events: none;

    border-top: 1px dashed transparent;
    border-bottom: 1px dashed transparent;
    border-left: 1px dashed transparent;
  }

  &.is-dragging {
    min-height: @menu-item-height;

    &:before {
      background-color: @room-item-active-bg;

      border-top: 1px dashed @search-message-decal-color;
      border-bottom: 1px dashed @search-message-decal-color;
      border-left: 1px dashed @search-message-decal-color;

      .dark-theme & {
        background-color: @dark-theme-left-menu-active-item-bg-color;
      }
    }
  }
}
</style>
