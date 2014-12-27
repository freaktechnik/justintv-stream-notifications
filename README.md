# Live Stream Notifier
[![Travis CI Builds](https://travis-ci.org/freaktechnik/justintv-stream-notifications.svg)](https://travis-ci.org/freaktechnik/justintv-stream-notifications)

This is an add-on for Firefox, based on the Mozilla add-on SDK.

## Description

Knowing when your favorite [twitch](http://twitch.tv) channels go live is hard. Most streamer notify their fan base via twitter. This add-on displays a notification when a streamer goes live.
The streams monitored can be set three different ways:
Automatically let the add-on search for your login name on[twitch](http://twitch.tv) and displaying notifications for your favorites, displaying notifications for favorites of defined users or just notifications for channels defined in the options. The best thing: you can use all three features to define monitored channels at once.
The add-on gives you full control: you can even customize the interval of the add-on refreshing the state of the channels.

The add-on can show a notification on different events: when a channel goes live, it changes its title or it goes offline.
A notification shows the title of the stream and the channel name, as well as the channel's profile picture. A click on the notification focuses the tab with the channel page, if already opened, or opens a new tab to watch the stream.

To check for missed notifications or to tune in to a channel later, the extension provides a panel with a list of currently live channels. The panel button changes its appearance, so you can see in one glance, whether any channel is online. You can manually refresh the channel statuses from the panel.

## Official Download

https://addons.mozilla.org/de/firefox/addon/justintv-stream-notificatio/

## Build yourslef

To build this extension you need npm. Open a command line and type
```
npm install jpm -g
jpm xpi
```
to build an in Firefox installable .xpi file. For other uses of jpm consider its documentation.

## License

See [LICENSE](LICENSE).
