# Contributing to Live Stream Notifier
This is a document guiding you on how to contribute to Live Stream Notifier. It
is separated by conribution nature and not limited to code contributions.

## Reporting Issues
Reporting issues directly on GitHub is more than welcome. Please include
debugging data that is obtained by <kbd>Shift</kbd> and clicking on the <samp>Help</samp>
button in the Channels Manager. It should not include any directly personal data,
however it will contain all channels and users and their current state as well
as things like your operating system and extension version.

## Translations
You can help to translate the extension on [Transifex](https://www.transifex.com/freaktechnik/live-stream-notifier).
If your language doesn't exist yet, just request a new team for it and I'll
approve it as soon as possible.

There is [a toutorial](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/l10n) how translations work and how you can live-test them.

I try to give as much contextual information as possible on Transifex. The glossary contains some common words, sometimes there are specific translation instructions or screenshots (in the string comments). If you're unsure where the string would be used, check the name of the string key, it generally contains whatever part it belongs to and if it's a label or whatever.

All strings for settings are tagged as "settings" and everything in the Channels Manager is tagged as "cm".

## Providers
If you are versed in JavaScript, especially in writing CommonJS modules, you can try to write a module for a provider. If you don't have an idea for a provider to add, check [all issues with the provider tag](https://github.com/freaktechnik/justintv-stream-notifications/labels/provider).

All code relevant to writing a provider module should be pretty well documented in JSDoc syntax, except for the existing provider implementations.
The new provider module will be in the [providers](lib/providers/) folder. The [generic-provider](lib/providers/generic-provider.js) in that folder implements a base class off of which I'd suggest to base your provider on. It documents the full interface your provider should implement. It's recommended to use the [Class](https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/core_heritage#Class) object from the SDK for heritage management. You can also see this in action in the other providers. Please note that "private" properties of the Class are prefixed with an `_` if they need access to `this`, else they are defined outside the Class.

Further helpers include the [queueservice](/lib/queueservice.js), which is already included with the GenericProvider by default, and the [pagination-helper](/lib/pagination-helper.js). The returned Channel and User objects are from [channeluser](/lib/channeluser.js).

To include your provider with the actual extension, export it in the [providers](/lib/providers.js) module. The property you export it on should match the type string you put on the returned Channel and User objects.

After the provider works, you'll have to add a string for the provider name in the [locales file](/locale/en.properties#L29) and add styling for the panel in the [list.css](/data/list.css#L147). You have to define two rules, as done for all the existing providers. The classname for your provider is the type string you specified.

## Other Code
This extension consists mostly of CommonJS modules and some actual HTML/CSS/JS.
The modules are sometimes documented, sometimes not. I'm trying to document all
modules, but it's a do it as you go thing. The web components aren't well
documented at all and are always three big files that are related.

## On Pull Requests
I will acept all pull requests, whenever I feel like it's reusing the same
coding style as was used before. Yes, there are no formal definitions for the
style. I'll also give reocurring contributors direct access to the repo.
