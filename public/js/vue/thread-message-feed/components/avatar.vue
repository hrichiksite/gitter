<script>
import _ from 'lodash';

const avatars = require('gitter-web-avatars');
const resolveUserAvatarSrcSet = require('gitter-web-shared/avatars/resolve-user-avatar-srcset');

const AVATAR_SIZE_TABLE = {
  s: 30,
  m: 48
};

export default {
  name: 'Avatar',
  props: {
    size: {
      type: String,
      default: 's',
      validator: value => _.contains(['s', 'm'], value)
    },
    user: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    fallbackSrcSet: undefined
  }),
  computed: {
    imgSize() {
      return AVATAR_SIZE_TABLE[this.size];
    },
    avatarSrcSet() {
      return this.fallbackSrcSet || resolveUserAvatarSrcSet(this.user, this.imgSize);
    }
  },
  methods: {
    setFallbackImage() {
      this.fallbackSrcSet = {
        src: avatars.getDefault()
      };
    }
  }
};
</script>

<template>
  <div class="trpDisplayPicture" :class="[{ inactive: user.removed }, `avatar-${size}`]">
    <img
      class="avatar__image"
      :src="avatarSrcSet.src"
      :srcset="avatarSrcSet.srcset"
      :alt="user.displayName"
      @error="setFallbackImage"
    />
  </div>
</template>

<style lang="less" scoped>
@import 'base-avatar';
</style>
