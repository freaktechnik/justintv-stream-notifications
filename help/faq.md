---
  layout: page
  title: FAQ
  permalink: /help/faq/
  redirect_from: /faq.html
---
I've just encountered a bug!
----------------------------
 1. Go to the [GitHub Issues page](http://github.com/freaktechnik/justintv-stream-notifications/issues) and report the issue.
 2. Disable and reenable the Add-on. This should fix it in most cases.

It doesn't display my favorite channels when they are online!
-------------------------------------------------------------
You probably haven't added any channels to the channels manager yet. To open it, click <samp>Manage</samp> in the panel or open it via the extension's settings.

How do I go to the extension's settings?
----------------------------------------
Open the Add-ons manager in Firefox. To open it, click on the menu button and then <samp>Add-ons</samp> or open a new tab and type `about:addons` in the URL-bar. Click the <samp>Preferences</samp> button in the row of this extension in the Add-ons manager and you're done.

It shows hosted channels for Twitch users!
------------------------------------------
See the [about:config setting](/aboutconfig/) `twitch_showHosting`. The page also lists a setting to disable MLG.tv rebroadcasts being treated as the channel being live.

When I add a channel, it doesn't add the channel but a lot of other channels
----------------------------------------------------------------------------
See [Adding a singe channel](channels-manager/#adding-a-singe-channel).

I can't find a setting for something important
-----------------------------------------
If you're lucky, there is an [about:config setting](/aboutconfig/) for it.

Why isn't the extension in the language my browser is in?
---------------------------------------------------------
That's most likely because it hasn't been translated into it yet. You can help translating it on [Babelzilla](http://beta.babelzilla.org/projects/p/jtvn/).

I want to hear a sound whenever I get a notification
----------------------------------------------------
Because there seems to be demand for this I've decided to create an extension that plays a sound whenever a notification is shown. You can get it [here](https://addons.mozilla.org/firefox/addon/notification-sound/).
