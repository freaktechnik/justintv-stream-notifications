# ![](data/icon36.png) Live Stream Notifier
[![Travis CI Builds](https://travis-ci.org/freaktechnik/justintv-stream-notifications.svg)](https://travis-ci.org/freaktechnik/justintv-stream-notifications)

This is an add-on for Firefox, based on the Mozilla add-on SDK.

## Description

This extension shows you a notification, whenever a followed channel on Twitch, Hitbox, Ustream, Livestream, MLG.tv, Azubu or YouTube goes live. But the notifications don't stop there: you can also get notifications when a stream changes the title or goes offline. If a followed Twitch channel is hosting somebody else, you'll get notified, too.

### Channel Management
You can manage the followed channels with a powerful channels manager, which lets you auto import all the channels you follow with one click, add all channels a user follows or just add a single channel. Of course it also lets you remove channels.

### Panel
Sometimes you miss notifications, but thanks to the handy panel, accessed by a button, which has a red dot if any channel is live, you always have access to all the channels the extension is monitoring. You can open their archive page or refresh them. The panel has three different styles, a compact one, if you follow a lot of people, a more spaceous one and a layout with thumbnails of the live streams. Each channel has a context menu, which lets you refresh the channel's status, go directly to its chat or go to its VOD archive, if it's live. The panel has a filter function, so you can quickly find a channel. You can add the category name and viewer count, if it's supported by the network.

### Providers
List of supported providers with some explanation on what they are can be found on http://jtvn.humanoids.be/providers/.

## Official Download

https://addons.mozilla.org/de/firefox/addon/justintv-stream-notificatio/

## Contribute
### Translations
You can help to translate the extension on [BabelZilla](http://beta.babelzilla.org/projects/p/jtvn/)

### Providers
If you are versed in JavaScript, especially in writing CommonJS modules, you can try to write a module for a provider. If you don't have an idea for a provider to add, check [all issues with the provider tag](https://github.com/freaktechnik/justintv-stream-notifications/labels/provider).

All code relevant to writing a provider module should be pretty well documented in JSDoc syntax, except for the existing provider implementations.
The new provider module will be in the [providers](lib/providers/) folder. The [generic-provider](lib/providers/generic-provider.js) in that folder implements a base class off of which I'd suggest to base your provider on. It documents the full interface your provider should implement. It's recommended to use the [Class](https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/core_heritage#Class) object from the SDK for heritage management. You can also see this in action in the other providers. Please note that "private" properties of the Class are prefixed with an `_` if they need access to `this`, else they are defined outside the Class.

Further helpers include the [queueservice](/lib/queueservice.js), which is already included with the GenericProvider by default, and the [pagination-helper](/lib/pagination-helper.js). The returned Channel and User objects are from [channeluser](/lib/channeluser.js).

To include your provider with the actual extension, export it in the [providers](/lib/providers.js) module. The property you export it on should match the type string you put on the returned Channel and User objects.

After the provider works, you'll have to add a string for the provider name in the [locales file](/locale/en.properties#L29) and add styling for the panel in the [list.css](/data/list.css#L147). You have to define two rules, as done for all the existing providers. The classname for your provider is the type string you specified.

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
