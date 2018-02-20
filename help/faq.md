---
  layout: page
  title: FAQ
  permalink: /help/faq/
  redirect_from: /faq.html
---
I've just encountered a bug!
----------------------------
 1. Go to the [GitHub Issues page](https://github.com/freaktechnik/justintv-stream-notifications/issues) and report the issue.
 2. Disable and reenable the Add-on. This should fix it in most cases.

What's the difference between "non-live" and offline?
-----------------------------------------------------
Non-live are channels either re-streaming a previous broadcast or redirecting to another stream.

It doesn't display my favorite channels when they are online!
-------------------------------------------------------------
You probably haven't added any channels to the channels manager yet. To open it, click <samp>Manage</samp> in the panel or open it via the extension's settings.

How do I go to the extension's settings?
----------------------------------------
Open the Add-ons manager in Firefox. To open it, click on the menu button and then <samp>Add-ons</samp> or open a new tab and type `about:addons` in the URL-bar. Click the <samp>Preferences</samp> button in the row of this extension in the Add-ons manager and you're done.

When I add a channel, it doesn't add the channel but a lot of other channels
----------------------------------------------------------------------------
See [Adding a singe channel](/help/channels-manager/#adding-a-singe-channel).

Why isn't the extension in the language my browser is in?
---------------------------------------------------------
That's most likely because it hasn't been translated into it yet. You can help translating it on [Transifex](https://www.transifex.com/freaktechnik/live-stream-notifier).

I want to hear a sound whenever I get a notification
----------------------------------------------------
Because there seems to be demand for this I've decided to create an extension that plays a sound whenever a notification is shown. You can get it [here](https://addons.mozilla.org/firefox/addon/notification-sound/).

What are all these permissions used for?
----------------------------------------
 - **Access browser tabs**: Decide if a notification needs to be shown, switch to already opened tabs of streams when opening them
 - **Display notifications to you**: To show notifications when channel states change and when a channel is copied to the clipboard or an error occurs within the extension
 - **storage**: To save the extension settings
 - **alarms**: To update channel statuses regularly
 - **Input data to the clipboard**: Copy channel URL in a predefined pattern to the clipboard, copy debugging information
 - **Download files and read and modify the browser’s download history**: Export settings, channels and users
 - **Monitor extension usage and manage themes**: Detect the presence of Streamlink Helper
 - **Store unlimited amount of client-side data**: Ensure the database is not deleted
 - **Access your data for** `https://www.googleapis.com/youtube/v3/*`: Check the status of YouTube channels
 - **Access your data for** `https://livestream.com/api/*`: Check the status of livestream.com channels
 - **Access your data for** `https://tmi.twitch.tv/*`: Check the hosting status of Twitch channels
 - **Access your data for** `http://www.ustream.tv/*`: Add UStream channels by username
 - **Access your data for** `http://*.api.channel.livestream.com/2.0/*`: Check the status of old livestream channels
 - **Access your data for** `https://www.majorleaguegaming.com/api/*`: Check the status of MLG.tv channels
 - **Access your data for** `https://streamapi.majorleaguegaming.com/service/streams/*`: Get info of MLG.tv channels

See https://support.mozilla.org/kb/permission-request-messages-firefox-extensions for explanations what permissions allow an extension to do in general.
