# Rooms

Rooms are part of a community.

Rooms are also referred to as "troupes" internally in the codebase for legacy reasons.

All rooms have unlimited message history, public or private.


## People/Roster

You can see who is in the room and add/invite new users via the roster section in the right-toolbar

![](https://i.imgur.com/nW29SY1.png)

#### Eyeballs Disambiguation

Eyeballs are the green and yellow/orange dots on top of the avatars in the people section of a room. They represent the current status or online presence of a person in the room.

![](https://i.imgur.com/MRuIXK4.png)

So what does each color mean?

 - **Green**: Actively looking at the room
 - **Yellow/Orange**: Not actively looking at the room

"Actively looking" equates to whether the window has focus and the room is open.



## Room user

### Leave a room

You can leave a room via **Room settings dropdown** -> **Leave this room**

If you have mad skillz, you can also type "/leave" in the chat room (slash command).

It's not possible to leave a one to one room, only hide it(see below)

![](https://i.imgur.com/Rc4EVnV.png)


### Hide a room

You can hide a room via **Room settings dropdown** -> **Hide this room**

Hiding a room with keep it from appearing in your left-menu room list. If you receive a notification for the room again, it will reappear. If you no longer wish to receive notifications from that room, you should either leave that room (`/leave` slash command) or change notifications to mentions only. You cannot leave a one to one room.

![](https://i.imgur.com/ceIVTNd.png)


## Room admin

### Room creation

Use the **+** -> **Create room** option in the bottom-left of the menu bar to start the room creation process.

![](https://i.imgur.com/Mt6sMOe.png)

If you want to associate the room with a GitLab project or GitHub repo, just select it from the repo dropdown (make sure you are signed in respectively with GitLab or GitHub). If you don't see a GitHub repo listed in the dropdown, see the [FAQ](./faq.md#why-isnt-my-github-organisation-or-repos-appearing)

![](https://i.imgur.com/yOobB1g.png)


#### Why isn't my GitHub organisation or repos appearing?

See the [FAQ](./faq.md#why-isn-t-my-github-organisation-or-repos-appearing).


### Room security

**Public rooms**

 - A public room can be seen by everyone

**Private rooms**

 - A room connected to a private project/repo can be accessed by anyone with access to the project/repo.
 - A private room with no association can only be accessed if they are manually invited to the room.
 - A private room can also be associated with the community and anyone in the community can join the room. If the community was associated with an group/org, anyone in the group/org could join for example

#### Change room security after creation

It is currently not possible to adjust your room security (public/private) after creation,
but we can do it manually for you.

Send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Link to the room on Gitter
 - New desired public/private security or repo/org association
 - Some context behind the change

You can track https://gitlab.com/gitlab-org/gitter/webapp/issues/676 for progress on this issue.



### Room topic/description

A room topic/description will help the community members and new people joining to know what's the purpose of the room.

To set up your room topic, double-click on the area next to the room name in the chat header.

You can also use the `/topic <some topic message>` slash command to set the room topic.

![](https://i.imgur.com/ecdteoh.png)

### Room welcome message

You can set a room welcome message via **Room settings dropdown** -> **Settings** -> **Welcome message**. This message is only shown when joining a room and the user needs to click the "I understand" button before joining the room.

![](https://i.imgur.com/ujd8kHE.png) ![](https://i.imgur.com/06azySl.png) ![](https://i.imgur.com/Sou791K.png)


### Add a Gitter badge to your repo readme

During room creation, if you add a repo association, you will see a checkbox option **Send PR to add the Gitter badge to your README**, that will automagically have the [Gitter Badger bot](https://github.com/gitter-badger) send a pull request to add the Gitter badge.

If you missed that option during room creation, after the fact, you can go to the **Room settings dropdown** -> **Share this chat room** -> **README badge** and copy the markdown text to put in your own readme.
If your room is associated with a GitHub repo, you can use the **Send pull request** button to have the [Gitter Badger bot](https://github.com/gitter-badger) send a pull request with the badge markdown added.

![](https://i.imgur.com/LRwMqHk.png)


### Moderation

As an admin of the room, you can delete messages from other users.

You can add new admins for a room via **Room settings dropdown** -> **Permissions** modal


### Restrict room to GitHub users

You can restrict a room to GitHub users via **Room settings dropdown** -> **Settings** -> **Only GitHub users are allowed to join this room.** checkbox

![](https://i.imgur.com/ujd8kHE.png) ![](https://i.imgur.com/oOGoEYw.png)


### Rename a room

If you want to rename a room because a GitHub repo was renamed/transferred, see this [FAQ section instead](./faq.md#what-happens-if-i-rename-something-on-GitHub-org-repo) instead.

Currently, there isn't a way to rename a room in the UI. But you can send a message to support@gitter.im with the following info. Make sure to email with the primary email address associated with the GitLab/GitHub/Twitter account tied to your Gitter account.

 - Link to the current Gitter room
 - Desired room name


### Delete a room

If you are a room admin, you can delete a room via **Room settings dropdown** -> **Delete this room**

![](https://i.imgur.com/FqxWgsM.png)
