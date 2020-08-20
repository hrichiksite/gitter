<script>
import { mapState, mapActions } from 'vuex';
import MenuBarItem from './menu-bar-item.vue';
import isMobileBreakpoint from '../../../utils/is-mobile-breakpoint';

export default {
  name: 'MenuBarItemToggle',
  extends: MenuBarItem,

  computed: {
    ...mapState(['leftMenuPinnedState', 'leftMenuExpandedState'])
  },

  methods: {
    ...mapActions(['toggleLeftMenuPinnedState', 'toggleLeftMenu']),

    onClick() {
      const isMobile = isMobileBreakpoint();
      // Always unpinned on mobile, so you can only expand/collapse
      if (isMobile) {
        this.toggleLeftMenu(!this.leftMenuExpandedState);
      } else {
        this.toggleLeftMenuPinnedState(!this.leftMenuPinnedState);
      }
    }
  }
};
</script>
