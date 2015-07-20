---
  layout: page
  title: about:config Settings
  permalink: /aboutconfig/
  redirect_from: /aboutconfig.html
  group: navigation
---
Live Stream Notifier has some advanced settings, only customizeable via about:config.

Open about:config
-----------------
To open about:confg, open a new tab and enter `about:config` into the URL-bar. If you never used about:config before you will see a message, asking you to be cautious about what you do. You can break Firefox with about:config tweaks pretty easily.

Available Settings
------------------
Live Stream Notifier offers the following hidden settings in the `extensions.jid0-z2wAjbeFD5dTCgsj70eQ6UAqQl4@jetpack` branch:

 - `queue_ratio` (Default: 2) Defines the part of the queue fetched minimally at a time. It will always fetch at least one request. The value is reciproke to the actual used ratio.
 - `queue_maxRequestBatchSize` (Default: 8) The maximal number of requests fetched at once.
 - `panel_minWidth` (Default: 320) The minimal width in pixels of the panel.
 - `panel_maxHeight` (Default: 400) The maximal height in pixels of the panel.
 - `panel_badge` (Default: false) Show a badge with the number of live channels on the button.
 - `twitch_clientID` Twitch developer application client ID.
 - `twitch_showHosting` (Default: true) Whether to check Twitch channels if they are hosting another channel.
 - `youtube_apiKey` YouTube public application API key.
 - `mlg_showRebroadcasts` (Default: true) Shows streams that are being rebroadcastet as live when enabled.
 - `channellist_cacheTime` (Default: 600000) How long the channel states will be remembered while Firefox is closed.

The `sdk` subbranch are Add-on SDK specific preferences and should not be changed, except for the `sdk.console.logLevel` preference.

Any other settings in this branch are either available through the add-on settings in the add-ons manager or no longer have any effect. If preferences with a default value are not listed in your config they aren't available in your version of the extension yet.

