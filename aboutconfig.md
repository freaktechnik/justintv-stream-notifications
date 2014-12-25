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
Live Stream Notifier offers the following hidden settings:

 - `queue_ratio` (Default: 2) Defines the part of the queue fetched minimally at a time. It will always fetch at least one request. The value is reciproke to the actual used ratio.
 - `queue_maxRequestBatchSize` (Default: 8) The maximal number of requests fetched at once.
 - `panel_minWidth` (Default: 320) The minimal width in pixels of the panel.
 - `panel_maxHeight`(Default: 400) The maximal height in pixels of the panel.
 - `twitch_clientID` Twitch developer application client ID.

