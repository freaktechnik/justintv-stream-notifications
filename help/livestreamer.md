---
  title: Streamlink Integration Help
  permalink: /help/livestreamer/
  layout: page
---
## What is Livestreamer and Streamlink?
[Livestreamer](http://livestreamer.io) is a command-line program that opens
streams with a native video player like VLC.

Streamlink is a fork of livestreamer, since livestreamer is no longer maintained.

## How do I use Streamlink with this extension?
Go to the extension settings and set the stream URL copy pattern to the streamlink
command you want to run to open a stream. This would for example look like `streamlink {URL} source`.

You can then copy that command for a channel from the context menu in the panel
and then execute it in a console to launch Streamlink.

## Will this extension ever support launching Streamlink directly?
No, but an integration with the [Streamlink Helper Extension](https://addons.mozilla.org/firefox/addon/streamlink-helper) is in development.
