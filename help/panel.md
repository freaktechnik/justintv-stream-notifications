---
  title: Panel Help
  permalink: /help/panel/
  layout: page
---
## The button
The panel is accessed via a button in the browser toolbar.

### The button is missing
If the button isn't in any toolbar or the menu, it can be re-added by clicking
on <samp>Customize</samp> in the menu. The button can then be dragged to the
desired location.

### Live state indication
The button shows if channels are live. It can even show a little counter of how
many channels are live. This can be enabled in the add-on preferences with
<samp>Show counter badge</samp>.

If there are live channels the button looks like ![](/justintv-stream-notifications/img/icon18.png) (with a
red dot in the middle) and if all are offline it looks like
![](/justintv-stream-notifications/img/offline18.png) (with a white dot in the middle).

## Channels in the panel
The panel is designed to always show a list of channels. At the top, you can
select which list to display. <samp>Live</samp> shows all the channels that
currently have a livestream running, <samp>Offline</samp> shows all added
channels that don't. <samp>Explore</samp> shows channels recommended by the
selected provider, see [The Explore Tab](#the-explore-tab) for more information.

A channel always shows its avatar and username. If it's live, it also shows a
title, if the broadcast has a title. The color of the background and text when
hovering over the channel differ by the provider the channel is from.
More info can be shown, see [Extra info](#extra-info).

## Panel Layouts
The panel comes in three layouts:

 - *Compact*
   The channels don't show their title when live and have a height of one line.
 - *Normal*
   The channels are two lines high and show a bigger avatar.
 - *Big Thumbnail*
   Added to the layout for Normal, the thumbnail for the stream is shown as
   background.

## Extra info
When the <samp>Extra info in panel</samp> preference in the add-on
settings is enabled, each live channel has an extra line of information.
The extra infos are only shown when the specific meta information is available
from the provider.

Currently the extras include number of viewers, the category of the stream, the
provider type and the uptime of the stream.

## Default click action
You can change the default action when a channel is clicked in the advanced
extension settings. You can choose between:

- Open stream in tab (or focus existing tab)
- Open channel archive in tab (or focus existing tab)
- Open stream chat in tab (or focus existing tab)
- Open context panel for channel
- Copy channel URL
- *If Streamlink Helper is installed*: Open with Streamlink

## Search
When clicking on the magnifying glass icon in the top right of the panel a text
input field for search is shown. It filters the current list with the given
strings, [like in the channels manager](/justintv-stream-notifications/help/channels-manager#find-a-certain-item),
just that it searches in all potentially displayed information - even in the
extras when they're hidden.

## Sorting
By clicking the up/down arrows the sorting options are toggled. The channels can
be sorted by multiple fields, and at that both ascending and descending. The
available fields depend on the tab.

For some sort fields, sub headings are displayed whenever the value changes for
easier navigation.

the default field to sort by and the default direction to use can be chosen in
the extension options.

## The <samp>Explore</samp> tab
The panel's third tab is a special tab with content that is not controlled by
the user, but the selected provider. There is a drop-down to switch between
provider.

The search doesn't search in the featured providers but instead searches
all streams on the provider's platform.
