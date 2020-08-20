<script>
import LoadingSpinner from '../../components/loading-spinner.vue';
import { BDropdown, BDropdownForm, BDropdownItemButton } from 'bootstrap-vue';

export default {
  name: 'CreateRoomView',
  components: {
    LoadingSpinner,
    BDropdown,
    BDropdownForm,
    BDropdownItemButton
  },
  props: {
    items: {
      type: Array,
      required: true
    },
    selectedItem: {
      type: Object
    },
    filterText: {
      type: String,
      required: true
    },
    filterPlaceholder: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean
    },
    error: {
      type: [Error, Boolean]
    }
  },
  computed: {
    filterTextModel: {
      get() {
        return this.filterText;
      },
      set(newFilterText) {
        this.$emit('filterInput', newFilterText);
      }
    }
  },
  methods: {
    onDropdownShown() {
      // Focus the filter when the dropdown opens so you can just start typing
      this.$refs.filterTextInput.focus();
    },
    onItemSelected(item) {
      if (this.selectedItem && item.id === this.selectedItem.id) {
        this.$emit('itemSelected', null);
      } else {
        this.$emit('itemSelected', item);
      }
    }
  }
};
</script>

<template>
  <b-dropdown
    class="select-dropdown"
    toggle-class="select-dropdown-button"
    menu-class="select-dropdown-menu"
    @shown="onDropdownShown"
  >
    <template v-slot:button-content>
      <slot name="button-content" :selectedItem="selectedItem"></slot>
    </template>

    <b-dropdown-form>
      <input
        ref="filterTextInput"
        v-model="filterTextModel"
        class="filter-input"
        :placeholder="filterPlaceholder"
      />
    </b-dropdown-form>

    <b-dropdown-item-button v-if="loading"> <loading-spinner /></b-dropdown-item-button>
    <b-dropdown-item-button v-if="error">
      Error occured while fetching: {{ error }}
    </b-dropdown-item-button>

    <ul class="select-dropdown-item-list">
      <b-dropdown-item-button
        v-for="item in items"
        :key="item.id"
        :button-class="{
          'select-dropdown-item': true,
          active: selectedItem && item.id === selectedItem.id
        }"
        @click="onItemSelected(item)"
      >
        <slot name="item-content" v-bind="item"></slot>
      </b-dropdown-item-button>
    </ul>
  </b-dropdown>
</template>

<style lang="scss" scoped>
.select-dropdown /deep/ {
  @import '~bootstrap/scss/functions';
  @import '~bootstrap/scss/variables';
  @import '~bootstrap/scss/mixins';
  @import '~bootstrap/scss/dropdown';
  @import '~bootstrap-vue/src/variables';
  @import '~bootstrap-vue/src/components/dropdown';
}
</style>

<style lang="less" scoped>
@import (reference) 'colors';

@import (reference) '../styles/shared.less';

.select-dropdown {
  float: none;
  width: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;

  &::v-deep {
    .select-dropdown-button {
      .input-styles();

      overflow: hidden;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .select-dropdown-menu {
      max-width: 100%;
    }

    .select-dropdown-item-list {
      overflow-x: hidden;
      overflow-y: auto;
      max-height: 40vh;
      margin-left: 0;
    }

    .select-dropdown-item {
      text-overflow: ellipsis;
      overflow: hidden;

      &.active {
        color: #ffffff;
        background: @linkColorHover;
      }

      &:hover,
      &:focus {
        color: #ffffff;
        background: @linkColor;
      }
    }
  }
}

.filter-input {
  width: 100%;
  height: 1.5em;
}
</style>
