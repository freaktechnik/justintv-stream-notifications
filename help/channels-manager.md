---
  title: Channels Manager Help
  permalink: /help/channels-manager/
  layout: page
---
## Adding a singe channel
 - Click the <samp>Add…</samp> button on the left end of the toolbar
 - Select <samp>Channel</samp> in the popup
 - Enter the channel's username in the <samp>Username</samp> textfield
 - Click <samp>Ok</samp>

## Adding the channels a user follows
 - Click the <samp>Add…</samp> button on the left end of the toolbar
 - Select <samp>User</samp> in the popup
 - Enter the user's username in the <samp>Username</samp> textfield
 - Hit <samp>Ok</samp>

Sadly not all APIs allow the extension to get the channels a user follows. And there's the special case YouTube:

### It doesn't fetch the subscriptions of this YouTube user
On YouTube, you can define if your subscriptions are public or not. The add-on can only read them if they are set to public.
If you can change the settings of the user you want to add the subscriptions of follow these steps:

 - Go to the [YouTube privacy settings](https://www.youtube.com/account_privacy)
 - Uncheck the second checkbox <samp>Mark all my subscriptions as private</samp>
 - Save the settings by hitting the save button at the top of the page

Live Stream Notifier should now be able to fetch this account's subscriptions.

## What's the "username" for…

### Dailymotion
The channel slug (visible in the URL bar when visiting a channel).

### DouyuTV
The number in the URL of the channel.

### Old Livestream
The channel username on the classic livestream service, visible in the channel's URL.

### New Livestream
The ID of a channel on the new livestream service (the normal one). The ID is the first number part in the URL to the profile: `http://livestream.com/accounts/0000000`. In this case it would be "0000000".

### Mixer
The username of the channel.

### MLG.tv
The channel page URL without the `http://tv.majorleaguegaming.com/channel/` part.

### Picarto
The username in the URL of the channel.

### Smashcast
The channel username, it's in the URL and below the stream.

### Twitch
The channel username, it's in the URL and as link-text to the profile above the stream. Case doesn't matter.

### Ustream
The channel page URL without the `http://ustream.tv/` part. The extension currently can't handle adding IDs directly.

### YouTube
The channel username, which is normally the URL for the channel without the `https://youtube.com/` part, or the ID of a channel, which is usually after `/c/` or `/channel/` in the URL. Aliases, which are redirects from `https://youtube.com/` are not supported.

## Automatically add channels I follow
This feature is currently unavailable due to Firefox API restrictions.

<!-- - Switch to the <samp>Users</samp> tab at the top
 - Click the <samp>Auto add</samp> button

Note that this currently only works with Twitch, Mixer and Smashcast due to API restrictions with the other providers.-->

## Remove a channel
 - Switch to the <samp>Channels</samp> tab at the top
 - Select channel in the list by clicking on it
 - Click the <samp>Remove</samp> button in the toolbar or hit the <kbd class="single">Delete</kbd> key

## I removed a channel and now a user is gone
If a user follows a channel and the channel is removed, the user is removed too, because the channel would be re-added if the user's folowees would be refreshed.

## Remove a user
 - Switch to the <samp>Users</samp> tab at the top
 - Select the user to remove by clicking on it
 - Click the <samp>Remove</samp> button in the toolbar or hit the <kbd class="single">Delete</kbd> key
 
Holding the <kbd class="single">Shift</kbd> key while removing the channel will also remove all channels the user follows. This can potentially remove other users, since they may follow a channel that is removed.

## Refreshing the channels a user follows
 - Switch to the <samp>Users</samp> tab at the top
 - Select the user to refresh the folowees of
 - Hit the <samp>Update</samp> button in the toolbar

Note that this will never remove a channel. This is also done every so often for each user in the background while the browser is running.

## Removing multiple items
You can select multiple items in the channels or users list with the <kbd class="single">Shift</kbd> and <kbd class="single">Ctrl</kbd> key modifiers, as well as using <kbd><kbd>Ctrl</kbd> + <kbd>A</kbd></kbd>.

## Find a certain item
The channel manager's filter field, which is located to the right of the toolbar buttons. It can alternatively be focused by pressing <kbd><kbd>Ctrl</kbd> + <kbd>F</kbd></kbd>. It will filter out any items in the current tab that do not contain the filter in their display name or provider type. A space separates a filter, so filtering with "twitch b" will only display Twitch channels that contain a b in their name. However "twitch t" will display all twitch channels, since "Twitch" contains at least one t.