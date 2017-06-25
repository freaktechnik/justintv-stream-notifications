# ![](webextension/assets/images/icon.svg) Live Stream Notifier

[![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/justintv-stream-notifications.svg)](https://greenkeeper.io/)
[![Travis CI Builds](https://travis-ci.org/freaktechnik/justintv-stream-notifications.svg)](https://travis-ci.org/freaktechnik/justintv-stream-notifications) [![codecov.io](https://codecov.io/github/freaktechnik/justintv-stream-notifications/coverage.svg?branch=master)](https://codecov.io/github/freaktechnik/justintv-stream-notifications?branch=master) ![Dependencies](https://david-dm.org/freaktechnik/justintv-stream-notifications.svg) [![Dependency Status](https://dependencyci.com/github/freaktechnik/justintv-stream-notifications/badge)](https://dependencyci.com/github/freaktechnik/justintv-stream-notifications)

This is an add-on for Firefox, based on the Mozilla add-on SDK.

## Description

This extension shows you a notification, whenever a followed channel on Twitch, Smashcast, Ustream, Livestream, MLG.tv, Mixer or YouTube goes live. But the notifications don't stop there: you can also get notifications when a stream changes the title or goes offline. If a followed Twitch channel is hosting somebody else, you'll get notified, too.

### Channel Management
You can manage the followed channels with a powerful channels manager, which lets you auto import all the channels you follow with one click, add all channels a user follows or just add a single channel. Of course it also lets you remove channels.

### Panel
Sometimes you miss notifications, but thanks to the handy panel, accessed by a button, which has a red dot if any channel is live, you always have access to all the channels the extension is monitoring. You can open their archive page or refresh them. The panel has three different styles, a compact one, if you follow a lot of people, a more spaceous one and a layout with thumbnails of the live streams. Each channel has a context menu, which lets you refresh the channel's status, go directly to its chat or go to its VOD archive, if it's live. The panel has a filter function, so you can quickly find a channel. You can add the category name and viewer count, if it's supported by the network.

### Providers
List of supported providers with some explanation on what they are can be found on [streamnotifier.ch/providers](http://streamnotifier.ch/providers/).

## Official Download

[![addons.mozilla.org/](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-gh-readme)

## Contribute
For contribution instructions, check out [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Build it yourslef

To build this extension you need npm, which will install grunt and jpm. Open a command line and type
```
npm install -g grunt-cli
npm install
grunt build
```
to build an in Firefox installable .xpi file.

## License

See [LICENSE](LICENSE).
