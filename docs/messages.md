# Messages

All rooms have unlimited message history, public or private.


## Writing messages

By default, hitting Enter when a chat message is typed will send the message, **Chat mode**. If you want to write multi-line messages, you can either insert a line break manually (Shift + Enter). Alternatively, you can toggle **Compose mode** where Enter will add a line break without sending a message (Ctrl + Enter will send the message).

There is also toggle button that can be found to the right of the chat input area and will look like the following two icons depending on which mode is activated.

Chat Mode | Compose Mode
--- | ---
![](https://i.imgur.com/nmLvAJo.png) | ![](https://i.imgur.com/yUGHhwV.png)

Additionally, if you type three backticks followed by Enter, we will automagically toggle compose mode (as well as close your backticks for you) so you can easily type in code. When you send the message, compose mode will get toggled back off. Neat, huh?

#### Keyboard shortcuts

`Ctrl + /`: Toggle Normal/Compose Mode

**Normal Mode**

- `Enter` - to send message
- `Shift + Enter` - to go to new line

**Compose Mode**

- `Enter` - to go to new line
- `Shift + Enter` - to go to new line (behaves same as `Enter`)
- `Ctrl + Enter` - to send message


## Message syntax

### Markdown

This is probably one of the reasons you are here in the first place. Gitter supports markdown in chat. Yes, that's right. Markdown. In Chat. Such win.

We not only support basic markdown, but also we do syntax highlighting for code and also support issue mentions and @ mentions.

For those unfamiliar with markdown, [GitLab has a nice Markdown reference doc](https://docs.gitlab.com/ee/user/markdown.html). You can access a simple guide in the Gitter application by clicking on the `M↓` icon to the right of the chat input area.

### KaTeX (math formulas)

We also support [KaTeX](https://khan.github.io/KaTeX/) syntax for math/scientific formula notation.

Example:

Before | After
--- | ---
`$$ f(x) = \int_{-\infty}^\infty\hat f(\xi)\,e^{2 \pi i \xi x}\,d\xi $$` | ![](https://i.imgur.com/XXC1uoj.png)

### Mentions

You can directly mention someone else using the `@username` syntax. As you type their username or real name, it should appear in the typeahead for autocompletion.

If the person you mention has notifications enabled, they will see a notification that they have been mentioned.

If you're the admin of a room, you can make announcements by using `@/all`. Each person who has notification for `@/all` announcements enabled will see a notification of that annoucement.


### Issuable decorations

When you paste a link to a GitLab/GitHub issue, merge request, or pull request it will decorate into a special link where you can preview the contents without having to click through.

![](https://i.imgur.com/l0C97yR.png)


## Slash commands

We support a few /commands and will continue to add new ones. At the moment, you can do any of the commands listed below.

 - `/leave`: Leaves the chat room.
 - `/mark-all-read`: Mark all messages in the room as read
 - `/query @username`: Go 1:1 with `@username`.
 - `/fav`: Toggles the room as a favourite.
 - `/topic <some imaginative and brilliant description>`: Set the topic of the room to "some imaginative and brilliant text".
 - `/notify-all`: Switch the room to notify you for all messages
 - `/notify-announcements`: Switch the room to notify you for direct mentions and `@/all` announcements
 - `/notify-mute`: Switch the room to notify you only for direct mentions
 - `/me <some message>`: If you know IRC, you'll know what this does
 - `/remove @username`: Removes a user from a conversation. Only available to owners/admin of the conversation.
 - `/ban @username`: Bans a user from a conversation. Only available to owners/admins in public rooms.
 - `/unban @username`: Unbans a user from a conversation. Only available to owners/admins in public rooms.


## Threaded conversations

Threaded conversations allow you to better organize your messages by discussing separate topics in threads.

1. You can start a thread for every message in the room by choosing **Start a thread** option in the `...` dropdown in the top-right corner of every message.
2. If the message already has a thread attached to it, the easiest way to open the thread is to click on the thread message indicator below the message.
3. The rest of the conversation happens in what we call the Thread message feed where you can view and reply to the thread.

![Threaded messages screenshot](https://i.imgur.com/7MRkEAT.png)

### Support in mobile apps

Threads are minimally supported in the mobile apps and the [mobile apps overall may be deprecated](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2281) in the future.

Every thread message appears in the main message feed and it is marked as being part of a thread. When you click on the indicator, you are taken into web browser that will show you the whole thread. *The mobile apps don't provide a way to write threaded messages.*

![Child message indicator on native iOS app](https://i.imgur.com/9SVvdQi.png)

### Missing threaded conversation features

The threaded conversations don't have feature parity with the main messages yet. The main missing features are:

- [Typeahead in the message input](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2344) - usernames, emojis, issues
- [Decorating messages](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2340) - user profile popover, issue states
- [Replying workflows](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2341) - clicking @username populating the message input with the handle
- [Composing multiline messages](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2338)
- [Threaded conversation notifications - Unfollow thread](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2483)
- [Thread summary overview](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/2431)

Please see the full list of outstanding features in the [Threaded Conversations Epic](https://gitlab.com/groups/gitlab-org/-/epics/360)


## Edit messages

You can edit your own messages within the 5 minute edit window. The **Edit** option is available in the message `...` dropdown in the top-right corner of every message.

You can quickly jump to editing your last message by using the up-arrow keyboard interaction.

![](https://i.imgur.com/28mHUvq.png)


## Delete messages

The **Delete** option is available in the message `...` dropdown in the top-right of every message.

You can delete any of your own messages. Room admins can also delete a message.

![](https://i.imgur.com/klpJ1IX.png)


## Report messages

The **Report** option is available in the message `...` dropdown in the top-right of every message.

![](https://i.imgur.com/mE0gbPM.png)

Messages should only be reported if they are spam, scams, or abuse. False-reports will be punished.

Some examples of reportable messages,

 - Spam (especially messages cross-posted across many rooms)
 - Doxing and personal information
 - Random Ethereum addresses
 - Crypto scams and viruses
 - Skype address/number trolling for victims (scammers)
 - Excessive name calling and retaliation



## Searching messages

Search is located in the left menu under the magnifying glass menu bar icon. You can press **Ctrl/Cmd + S** to jump straight to that view.

Search will find rooms across Gitter and messages in the current room.

You can use the `from:username` syntax to only find messages from the specified user (filter).

You can use the `text:@username` syntax to find messages mentioning the specified user (filter)

You can use the `sent:[2020-06-08 TO 2020-06-09]` syntax to only find messages in the specified date range (filter).

You can use the `sent:[2020-06-09T16:17-03:00 TO 2020-06-09T16:21-03:00]` syntax to get more precise time control with an ISO 8601 date/time including timezone offset. (filter)

You can use logical operators `text:@(username1 OR username2)` `text:@(username1 AND username2)` (filter)

You can use the `word1 -word2` syntax to find messages containing `word1` but _not_ `word2`. (filter)

![](https://i.imgur.com/LYA2Vdf.png)


## Message archive

You can access a rooms message archive via the **Room settings dropdown** -> **Archives**.

The archive heatmap currently only shows a year but you can manually navigate by changing the URL. You can [track this issue for increasing the heatmap size](https://gitlab.com/gitlab-org/gitter/webapp/issues/785)

![](https://i.imgur.com/L8VrjAn.png)


## Permalinks

Click the timestamp in the top-right of any message and copy the URL from the address bar. You can also `Alt + Click` the timestamp to insert a markdown snippet into the message input.

![](https://i.imgur.com/xAiznSp.gif)

![](https://i.imgur.com/AxBF0Ep.png)


## Tips for crafting a great message

Some tips to improve your chances of getting a quick response and a great interaction.

### Do's

 - Be patient
 - Describe what you are trying to do, what you have tried so far, and what kind of behavior you are expecting
 - Share a link to what you are talking about
 - Create a demo on [jsFiddle](https://jsfiddle.net/), [CodePen](http://codepen.io/), etc
 - Use \`inline code\`, or actual code _blocks_ (```) when sharing code. We support markdown
 - Use complete sentences and proper grammar, it just makes your question a pain to read otherwise
 - If you figure out a solution to your problem after proposing a question, please post your answer so others don't waste their time trying to answer. It's also a good reference for future onlookers

### Don'ts

 - [Don't ask to ask, just ask your actual question directly](http://sol.gfxile.net/dontask.html)
    - Don't just say "Hello" or introduce yourself and wait for someone to respond, just ask your question
    - Don't ask if anyone is around
    - Don't ask if anyone is familiar with or knows about a specific thing that you are trying to use
 - Don't post across many rooms (cross posting). Post in the most relevant room and be patient
 - Don't ask people to respond to you in a one to one conversation
