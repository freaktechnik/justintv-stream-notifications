---
  title: Channels Manager Help
  permalink: /help/channels-manager/
  layout: page
---
## Adding a singe channel
 - Click the "Add..." button on the left end of the toolbar
 - Select "Channel" in the popup
 - Enter the channel's username in the "Username" textfield
 - Click "Ok"

## Adding the channels a user follows
 - Click the "Add..." button on the left end of the toolbar
 - Select "User" in the popup
 - Enter the user's username in the "Username" textfield
 - Hit "Ok"

Sadly not all APIs allow the extension to get the channels a user follows. And there's the special case YouTube:

### It doesn't fetch the subscriptions of this YouTube user
On YouTube, you can define if your subscriptions are public or not. The add-on can only read them if they are set to public.
If you can change the settings of the user you want to add the subscriptions of follow these steps:

 - Go to the [YouTube privacy settings](https://www.youtube.com/account_privacy)
 - Uncheck the second checkbox "Mark all my subscriptions as private"
 - Save the settings by hitting the save button at the top of the page

Live Stream Notifier should now be able to fetch this account's subscriptions.

## What's the "username" for...

### Azubu
The username, however it is case sensitive.

### Hitbox
The channel username, it's in the URL and below the stream.

### Livestream
The channel username on the classic livestream service, visible in the channel's URL.

### MLG.tv
The channel page URL without the `http://tv.majorleaguegaming.com/channel/` part.

### Twitch
The channel username, it's in the URL and as link-text to the profile above the stream. Case doesn't matter.

### Ustream
The channel page URL without the `http://ustream.tv/` part. The extension currently can't handle adding IDs directly.

### YouTube
The channel username, which is normally the URL for the channel without the `http://youtube.com/user/` part. The extension currently can't handle adding IDs directly.

## Automatically add channels I follow
 - Switch to the "Users" tab at the top
 - Click the "Auto add" button

Note that this currently only works with Twitch and Azubu due to API restrictions with the other providers.

## Remove a channel
 - Switch to the "Channels" tab at the top
 - Select channel in the list by clicking on it
 - Click the "Remove" button in the toolbar or hit the `Delete` key

## Remove a user
 - Switch to the "Users" tab at the top
 - Select the user to remove by clicking on it
 - Click the "Remove" button in the toolbar or hit the `Delete` key

## Refreshing the channels a user follows
 - Switch to the "Users" tab at the top
 - Select the user to refresh the folowees of
 - Hit the "Refresh" button in the toolbar

Note that this will never remove a channel. This is also done every so often for each user in the background while the browser is running.

## I removed a channel and now a user is gone
If a user follows a channel and the channel is removed, the user is removed too, because the channel would be re-added if the user's folowees would be refreshed.

## Removing multiple items
You can select multiple items in the channels or users list with the `Shift` and `Ctrl` key modifiers, as well as using `Ctrl`+`A`.

## Find a channel or user
The list of items in a tab can get pretty long. Thanks to the manager bieng like a website, you can use Firefox's "Find in Page" function (shortcut: `Ctrl`+`F`) to search in the channels manager.

