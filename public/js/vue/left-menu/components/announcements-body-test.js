const { isAnnouncementActive, ACTIVE_TILL } = require('./announcements-body.vue');

describe('announcements-body', () => {
  const DATE_NOW = Date.now;

  afterAll(() => {
    global.Date.now = DATE_NOW;
  });

  it('isAnnouncementActive when active', () => {
    let dayBefore = new Date(ACTIVE_TILL);
    dayBefore.setDate(ACTIVE_TILL.getDate() - 1);
    global.Date.now = jest.fn(() => dayBefore.getTime());
    expect(isAnnouncementActive()).toBeTruthy();
  });

  it('isAnnouncementActive when inactive', () => {
    let dayAfter = new Date(ACTIVE_TILL);
    dayAfter.setDate(ACTIVE_TILL.getDate() + 1);
    global.Date.now = jest.fn(() => dayAfter.getTime());
    expect(isAnnouncementActive()).toBeFalsy();
  });
});
