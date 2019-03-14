# ![](webextension/assets/images/icon.svg) Live Stream Notifier

[![Add-On Version](https://img.shields.io/amo/v/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghversion) [![AMO Rating](https://img.shields.io/amo/stars/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghrating) [![AMO User Count](https://img.shields.io/amo/users/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghusers) [![AMO Download Count](https://img.shields.io/amo/d/justintv-stream-notificatio.svg)](https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/?src=external-ghdownloads)<br>
[![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/justintv-stream-notifications.svg)](https://greenkeeper.io/)
[![Travis CI Builds](https://travis-ci.com/freaktechnik/justintv-stream-notifications.svg)](https://travis-ci.com/freaktechnik/justintv-stream-notifications) [![codecov.io](https://codecov.io/github/freaktechnik/justintv-stream-notifications/coverage.svg?branch=master)](https://codecov.io/github/freaktechnik/justintv-stream-notifications?branch=master) [![Dependencies](https://david-dm.org/freaktechnik/justintv-stream-notifications.svg)](https://github.com/freaktechnik/justintv-stream-notifications/network/dependencies)

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

```shell
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
<table><tr><td align="center"><a href="https://github.com/maekclena"><img src="https://avatars3.githubusercontent.com/u/7942850?v=4" width="100px;" alt="maekclena"/><br /><sub><b>maekclena</b></sub></a><br /><a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=maekclena" title="Code">💻</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3Amaekclena" title="Bug reports">🐛</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=maekclena" title="Tests">⚠️</a></td><td align="center"><a href="https://humanoids.be"><img src="https://avatars0.githubusercontent.com/u/640949?v=4" width="100px;" alt="Martin Giger"/><br /><sub><b>Martin Giger</b></sub></a><br /><a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=freaktechnik" title="Code">💻</a> <a href="#blog-freaktechnik" title="Blogposts">📝</a> <a href="#design-freaktechnik" title="Design">🎨</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=freaktechnik" title="Documentation">📖</a> <a href="#translation-freaktechnik" title="Translation">🌍</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=freaktechnik" title="Tests">⚠️</a></td><td align="center"><a href="https://www.transifex.com/user/profile/wolstrom/"><img src="https://secure.gravatar.com/avatar/9a552874c4033ee5658da8351500c0ca?s=100&d=identico" width="100px;" alt="wolstrom"/><br /><sub><b>wolstrom</b></sub></a><br /><a href="#translation-wolstrom" title="Translation">🌍</a></td><td align="center"><a href="https://github.com/LeLobster"><img src="https://avatars1.githubusercontent.com/u/11016915?v=4" width="100px;" alt="lelobster"/><br /><sub><b>lelobster</b></sub></a><br /><a href="https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3ALeLobster" title="Bug reports">🐛</a> <a href="#ideas-LeLobster" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=LeLobster" title="Tests">⚠️</a></td><td align="center"><a href="https://github.com/Silergo"><img src="https://avatars1.githubusercontent.com/u/32046715?v=4" width="100px;" alt="silergo"/><br /><sub><b>silergo</b></sub></a><br /><a href="#ideas-Silergo" title="Ideas, Planning, & Feedback">🤔</a></td><td align="center"><a href="https://github.com/adosikas"><img src="https://avatars3.githubusercontent.com/u/3721366?v=4" width="100px;" alt="adosikas"/><br /><sub><b>adosikas</b></sub></a><br /><a href="#ideas-adosikas" title="Ideas, Planning, & Feedback">🤔</a></td><td align="center"><a href="https://github.com/RedSnt"><img src="https://avatars2.githubusercontent.com/u/6242718?v=4" width="100px;" alt="redsnt"/><br /><sub><b>redsnt</b></sub></a><br /><a href="https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3ARedSnt" title="Bug reports">🐛</a></td></tr><tr><td align="center"><a href="https://github.com/Redthirst"><img src="https://avatars1.githubusercontent.com/u/9901055?v=4" width="100px;" alt="redthirst"/><br /><sub><b>redthirst</b></sub></a><br /><a href="https://github.com/freaktechnik/justintv-stream-notifications/issues?q=author%3ARedthirst" title="Bug reports">🐛</a> <a href="https://github.com/freaktechnik/justintv-stream-notifications/commits?author=Redthirst" title="Tests">⚠️</a></td><td align="center"><a href="https://vk.com/nikita.devyatov"><img src="https://secure.gravatar.com/avatar/2452b16cb0531512b2eb0cdcd8ecedec?s=100&d=identicon" width="100px;" alt="Nikita Devyatov"/><br /><sub><b>Nikita Devyatov</b></sub></a><br /><a href="#translation-jsutbenq" title="Translation">🌍</a></td><td align="center"><a href="https://www.transifex.com/user/profile/Sappa/"><img src="https://secure.gravatar.com/avatar/55bf08708678aec22d186b4074b719e3?s=100&d=identicon" width="100px;" alt="Volodymyr Savchuk"/><br /><sub><b>Volodymyr Savchuk</b></sub></a><br /><a href="#translation-Sappa" title="Translation">🌍</a></td><td align="center"><a href="https://github.com/Vistaus"><img src="https://avatars1.githubusercontent.com/u/1716229?v=4" width="100px;" alt="Heimen Stoffels"/><br /><sub><b>Heimen Stoffels</b></sub></a><br /><a href="#translation-Vistaus" title="Translation">🌍</a></td></tr></table>
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
