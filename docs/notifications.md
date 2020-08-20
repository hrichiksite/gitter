# Notifications

There are three levels of notification that you can set per-room or globally.

You can access the notification settings through the room settings icon(vertical sliders) in the top-right of the chat header -> Notifications.

For global notifications, click "Configure Defaults" in the bottom-left of the notification modal.

![](https://i.imgur.com/T5Zf40V.png) ![](https://i.imgur.com/avukqAD.png)

#### All

You will be notified of all messages in a room and see a corresponding number if your conversation list for each message you were notified for and haven't read.

#### Announcements

You will only see a subtle activity indicator for new unread messages. You will receive notifications if you are directly mentioned or there's an announcement (@/all).

Note: You will also get email notifications for all unread messages because that area of code coupled to email at the moment, see https://gitlab.com/gitlab-org/gitter/webapp/issues/1205

#### Mute

You will only see a subtle activity indicator for new messages. You will only receive notifications if you are directly mentioned.


## Desktop Notifications

By default, Gitter uses green flyout banners to show notifications.

![](http://i.imgur.com/69P3bIW.png)

You can instead use browser desktop notifications by allowing the browser permission. We ask when the page first loads but you may have but you can also change it at any time (Chrome pictured below).

![](http://i.imgur.com/wAbfet9.png)

![](http://i.imgur.com/8v6aCpX.png)

![](http://i.imgur.com/Mpttpxs.png) ![](https://i.imgur.com/YVqInos.png)
 

### Desktop Notification Settings

If you would like to change how you are notified on the Desktop, access the Gitter dropdown menu in the top-left corner of the application. From this menu you can change whether or not a visual notification appears on screen, as well as whether or not you would like a sound notification. For example, if you want to keep a visual notification while turning off the notification sound you could apply the following settings:

![](https://i.imgur.com/q6qud9N.png)


## Mobile notifications

### No notifications on mobile (Android, iOS)

When you have a Gitter instance open on a desktop/browser, we don't send a notification to your mobile device to avoid double-buzzing.

We understand this can be unexpected and undesirable, you can track, https://gitlab.com/gitlab-org/gitter/webapp/issues/1846

For Android, there is also an open bug around push notifications, https://gitlab.com/gitlab-org/gitter/gitter-android-app/issues/121


## Emails

You can toggle email notifications on and off in the "Configure Defaults" section of the notification modal. There is also an unsubscribe link at the bottom each notification email that does the same thing.

Emails are batched up and sent in 1 hour chunks. You can track [this issue](https://gitlab.com/gitlab-org/gitter/webapp/issues/143) for more immediate email notifications.

If you are using the [IRC bridge](https://irc.gitter.im/), it will mark every message as read so you won't receive any emails.

![](http://imgur.com/uKLeHd6.gif)



