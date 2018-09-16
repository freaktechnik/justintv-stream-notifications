# ![](webextension/assets/images/icon.svg) Live Stream Notifier

[![Add-On Version](https://img.shields.io/amo/v/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghversion) [![AMO Rating](https://img.shields.io/amo/stars/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghrating) [![AMO User Count](https://img.shields.io/amo/users/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghusers) [![AMO Download Count](https://img.shields.io/amo/d/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghdownloads)<br>
[![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/justintv-stream-notifications.svg)](https://greenkeeper.io/)
[![Travis CI Builds](https://travis-ci.org/freaktechnik/justintv-stream-notifications.svg)](https://travis-ci.org/freaktechnik/justintv-stream-notifications) [![codecov.io](https://codecov.io/github/freaktechnik/justintv-stream-notifications/coverage.svg?branch=master)](https://codecov.io/github/freaktechnik/justintv-stream-notifications?branch=master) [![Dependencies](https://david-dm.org/freaktechnik/justintv-stream-notifications.svg)](https://github.com/freaktechnik/justintv-stream-notifications/network/dependencies)

This is an add-on for Firefox, using the modern WebExtension APIs.

## Description

This extension shows you a notification, whenever a followed channel on Twitch, Smashcast, Ustream, Livestream, MLG.tv, Mixer, Dailymotion or YouTube goes live. It can also show notifications when a stream changes the title, hosts another channel, replays a past broadcast or goes offline.

### Channel Management
You can manage the followed channels with a powerful channels manager, which lets you auto import all the channels you follow with one click, add all channels a user follows or just add a single channel. Of course it also lets you remove channels.

### Panel
Sometimes you miss notifications, but thanks to the handy panel, accessed by a button, which has a red dot if any channel is live, you always have access to all the channels the extension is monitoring. You can open their archive page or refresh them. The panel has three different styles, a compact one, if you follow a lot of people, a more spaceous one and a layout with thumbnails of the live streams. Each channel has a context menu, which lets you refresh the channel's status, go directly to its chat or go to its VOD archive, if it's live. The panel has a filter function, so you can quickly find a channel. You can add the category name and viewer count, if it's supported by the network.

### Providers
List of supported providers with some explanation on what they are can be found on [streamnotifier.ch/providers](https://streamnotifier.ch/providers/).

## Official Download

[![addons.mozilla.org/](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-gh-readme)

## Build it yourslef

To build this extension you need npm, which will install webpack and web-ext. Open a command line and type
```
npm ci
npm run build
```
to build an in about:debugging loadable .xpi file. You can use `npm start` to launch Firefox with the extension pre-installed.

## License

See [LICENSE](LICENSE).

## Contribute
For contribution instructions, check out [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars3.githubusercontent.com/u/7942850?v=4" width="100px;"/><br /><sub><b>maekclena</b></sub>](https://github.com/maekclena)<br />[💻](https://github.com/freaktechnik/justintv-stream-notifications/commits?author=maekclena "Code") [🐛](https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3Amaekclena "Bug reports") | [<img src="https://avatars0.githubusercontent.com/u/640949?v=4" width="100px;"/><br /><sub><b>Martin Giger</b></sub>](https://humanoids.be)<br />[💻](https://github.com/freaktechnik/justintv-stream-notifications/commits?author=freaktechnik "Code") [📝](#blog-freaktechnik "Blogposts") [🎨](#design-freaktechnik "Design") [📖](https://github.com/freaktechnik/justintv-stream-notifications/commits?author=freaktechnik "Documentation") [🌍](#translation-freaktechnik "Translation") | [<img src="https://secure.gravatar.com/avatar/9a552874c4033ee5658da8351500c0ca?s=150&d=identico" width="100px;"/><br /><sub><b>wolstrom</b></sub>](https://www.transifex.com/user/profile/wolstrom/)<br />[🌍](#translation-wolstrom "Translation") | [<img src="https://avatars1.githubusercontent.com/u/11016915?v=4" width="100px;"/><br /><sub><b>lelobster</b></sub>](https://github.com/LeLobster)<br />[🐛](https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3ALeLobster "Bug reports") | [<img src="https://avatars1.githubusercontent.com/u/32046715?v=4" width="100px;"/><br /><sub><b>silergo</b></sub>](https://github.com/Silergo)<br />[🐛](https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3ASilergo "Bug reports") |
| :---: | :---: | :---: | :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
