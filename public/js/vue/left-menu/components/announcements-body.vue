<script>
export const ACTIVE_TILL = new Date('2020-05-21T00:00:00.000Z');

export const isAnnouncementActive = () => new Date(Date.now()) < ACTIVE_TILL;

export default {
  name: 'AnnouncementsBody'
};
</script>

<template>
  <div class="announcements-body-root">
    <h2 class="announcements-body-title">Announcement</h2>
    <p>
      This announcements tab is new! The Gitter team has been hard at work tackling these two new
      features and thought you should get some more direct info around them:
    </p>
    <ul>
      <li>
        <a
          href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/messages.md#threaded-conversations"
          target="_blank"
          >Threaded conversations</a
        >
        <ul>
          <li>A new way to organize your conversations and keep things on track in a busy room</li>
        </ul>
      </li>
      <li>
        GitLab based
        <a
          href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/communities.md#community-creation"
          target="_blank"
          >communities</a
        >
        and
        <a
          href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/docs/rooms.md#room-creation"
          target="_blank"
          >rooms</a
        >
        <ul>
          <li>
            Just like our GitHub integrated rooms, create rooms based on your GitLab groups and
            projects and inherit permissions
          </li>
        </ul>
      </li>
    </ul>
    <p>
      For more information about these features, dive into the
      <a
        href="https://blog.gitter.im/2020/05/04/threaded-conversations-and-gitlab-based-communities-and-rooms/"
        target="_blank"
        >blog post</a
      >
    </p>
    <p>
      The announcements tab will disappear in a few weeks but keep an eye out for it to appear
      again. We're going to reserve this space for bigger feature changes and announcements. You can
      keep up to date with everything that is happening by checking the
      <a
        href="https://gitlab.com/gitlab-org/gitter/webapp/-/blob/develop/CHANGELOG.md"
        target="_blank"
        >changelog</a
      >
      or following us on
      <a href="https://twitter.com/gitchat" rel="nofollow noreferrer noopener" target="_blank"
        >Twitter @gitchat</a
      >.
    </p>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'components/m-header-title';
@import (reference) 'dark-theme';

.announcements-body-root {
  padding: 10px;
  a {
    color: @blue;
  }
  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}

.announcements-body-title {
  .m-header-title();
}
</style>
