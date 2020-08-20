const { mapActions } = require('vuex');
const raf = require('../../../utils/raf');

const SWIPE_THRESHOLD = 5;
const SWIPE_INTENT_THRESHOLD = 60;
const VERTICAL_SCROLL_INTENT_THRESHOLD = 15;

const fingerSwipeMixin = {
  data() {
    return {
      rafTimeoutAnimateLeftMenuFingerSwipe: null,
      // We do not change the left-menu width
      // This is only to reference the width in the methods
      leftMenuWidth: null,
      // Stores the X position where the touch starts
      touchStartX: null,
      // Stores the Y position where the touch starts
      touchStartY: null,
      // Stores the X position where the touch is currently at
      touchCurrentX: null,
      // Stores the X position where the touch begins to go in one direction.
      // If the user changes direction in the middle of a touch,
      // we store where the X position where they changed direction.
      //
      // We use this to determine the users intention and finish off their swipe
      // to completely expand/collapse the left-menu based on their direction intention
      directionStartX: null,
      // When we detect vertical panning instead of horizontal, we cancel the whole touch/swipe
      // because the user is probably scrolling instead of working the left-menu
      currentTouchActionCancelled: false,
      transformCssValue: '',
      transitionCssValue: ''
    };
  },
  methods: {
    ...mapActions(['toggleLeftMenu']),
    // via https://stackoverflow.com/a/11409944/796832
    clamp(num, min, max) {
      return Math.min(Math.max(num, min), max);
    },

    animateLeftMenuFingerSwipe() {
      // No transition while we animate with JavaScript
      // If we leave the transition in place, the UI looks laggy and a bunch of repaints happen
      this.transitionCssValue = 'none';

      if (this.isExpanded) {
        this.transformCssValue = `translateX(calc(0% - ${this.clamp(
          this.touchStartX - this.touchCurrentX,
          0,
          this.leftMenuWidth
        )}px))`;
      } else {
        this.transformCssValue = `translateX(calc(-100% + ${this.clamp(
          -1 * (this.touchStartX - this.touchCurrentX),
          0,
          this.leftMenuWidth
        )}px))`;
      }
    },
    animateStop() {
      // If someone finger swiped past our intent deadzone threshold,
      // then expand/collapse in whatever direction they were aiming for
      if (
        this.directionStartX &&
        this.touchCurrentX &&
        Math.abs(this.directionStartX - this.touchCurrentX) > SWIPE_INTENT_THRESHOLD
      ) {
        if (this.directionStartX - this.touchCurrentX > 0) {
          this.toggleLeftMenu(false);
        } else {
          this.toggleLeftMenu(true);
        }
      }

      // Reset all of our JavaScript driven CSS properties we set while animating
      // so the normal CSS can take over
      this.transformCssValue = '';
      this.transitionCssValue = '';

      // Clear up any enqueued animation since the touch is done, the final state is already set above
      if (this.rafTimeoutAnimateLeftMenuFingerSwipe) {
        raf.cancel(this.rafTimeoutAnimateLeftMenuFingerSwipe);
      }
    },

    touchstartCallback(e) {
      // Prevent the left-menu from swiping in and out as you scroll a code block horizontally.
      // If the code block is not scrolled at all, you can still swipe open the left-menu
      const touchTarget = e.touches[0].target;
      const codeBlock = touchTarget && touchTarget.closest('code');
      if (codeBlock && codeBlock.scrollLeft !== 0) {
        this.currentTouchActionCancelled = true;
      }

      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.directionStartX = this.touchStartX;
    },

    touchmoveCallback(e) {
      if (this.currentTouchActionCancelled) {
        return;
      }

      const touchPreviousX = this.touchCurrentX;
      this.touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;

      // If someone is panning vertically, cancel this whole touch/swipe
      // because the user is probably scrolling, not opening the left-menu
      if (Math.abs(this.touchStartY - touchCurrentY) > VERTICAL_SCROLL_INTENT_THRESHOLD) {
        this.animateStop();
        this.currentTouchActionCancelled = true;
        return;
      }

      // If someone is changing direction in the middle of their touch/swipe
      // Record it so we know their new direction intention
      const previousDelta = touchPreviousX && this.directionStartX - touchPreviousX;
      const currentDelta = this.directionStartX - this.touchCurrentX;
      if (Math.abs(previousDelta) > Math.abs(currentDelta)) {
        this.directionStartX = this.touchCurrentX;
      }

      // Start animating the left-menu to follow the user's finger if they swipe over the small deadzone
      if (Math.abs(this.touchStartX - this.touchCurrentX) > SWIPE_THRESHOLD) {
        // Clear up the previous enqueued animation because we are asking for a new state
        // No need to try to update with an old state and overbear the CPU/GPU
        if (this.rafTimeoutAnimateLeftMenuFingerSwipe) {
          raf.cancel(this.rafTimeoutAnimateLeftMenuFingerSwipe);
        }

        this.rafTimeoutAnimateLeftMenuFingerSwipe = raf(this.animateLeftMenuFingerSwipe);
      }
    },

    touchendCallback() {
      if (!this.currentTouchActionCancelled) {
        this.animateStop();
      }

      // Reset the touch details
      this.touchStartX = null;
      this.touchStartY = null;
      this.touchCurrentX = null;
      this.directionStartX = null;
      this.currentTouchActionCancelled = false;
    }
  },

  mounted() {
    this.leftMenuWidth = this.$refs.root.offsetWidth;

    document.addEventListener('touchstart', this.touchstartCallback, { passive: true });
    document.addEventListener('touchmove', this.touchmoveCallback, { passive: true });
    document.addEventListener('touchcancel', this.touchendCallback);
    document.addEventListener('touchend', this.touchendCallback);
  },

  beforeDestroy() {
    document.removeEventListener('touchstart', this.touchstartCallback, {
      passive: true
    });
    document.removeEventListener('touchmove', this.touchmoveCallback, { passive: true });
    document.removeEventListener('touchcancel', this.touchendCallback);
    document.removeEventListener('touchend', this.touchendCallback);
  }
};

module.exports = fingerSwipeMixin;
