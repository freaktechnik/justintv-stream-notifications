// Load vendor deps
import 'file-loader?name=vendor/[name].[ext]!underscore/underscore-min.js';
import 'file-loader?name=vendor/[name].[ext]!event-target-shim/dist/event-target-shim.min.js';
// l10n
import '../../_locales/de/messages.json';
import '../../_locales/en/messages.json';
import '../../_locales/es_MX/messages.json';
import '../../_locales/fr/messages.json';
import '../../_locales/hr/messages.json';
import '../../_locales/ru/messages.json';
import '../../_locales/uk_UA/messages.json';

// Load module deps
import SDK from "./sdk";
import { selectOrOpenTab } from "./channel/utils";
import ChannelController from "./channel/controller";
import prefs from './preferences';
import LiveState from './channel/live-state';
import ListView from './list';
import serializedProviders from "./providers/serialized";
import * as qs from './queue/service';
import Notifier from "./notifier";

const S_TO_MS_FACTOR = 1000,
    BASE_URL = "http://streamnotifier.ch",

// Init things
    notifier = new Notifier(),
    controller = new ChannelController(),
    list = new ListView();

list.addEventListener("ready", () => {
    controller.getChannelsByType()
        .then((channels) => list.addChannels(channels));

    list.setProviders(serializedProviders);

    prefs.get([
        "updateInterval",
        "theme"
    ]).then(([ updateInterval, theme ]) => {
        list.setQueueStatus(parseInt(updateInterval, 10) !== 0);
        list.setTheme(parseInt(theme, 10));
    });
});

list.addEventListener("opencm", () => controller.showManager());
list.addEventListener("addchannel", ({ detail: [ login, type ] }) => {
    controller.addChannel(login, type);
});
list.addEventListener("refresh", ({ detail: channelId }) => {
    if(channelId) {
        controller.updateChannel(channelId);
    }
    else {
        controller.updateChannels();
    }
});
list.addEventListener("open", ({ detail }) => {
    let channelId, what, p;
    if(Array.isArray(detail)) {
        channelId = detail[0];
        what = detail[1];
    }
    else {
        channelId = detail;
    }
    if(typeof channelId === "string") {
        p = Promise.resolve({
            url: [ channelId ],
            live: new LiveState(LiveState.LIVE)
        });
    }
    else {
        p = controller.getChannel(channelId);
    }

    p.then((channel) => selectOrOpenTab(channel, what));
});
list.addEventListener("pause", () => qs.pause());
list.addEventListener("resume", () => qs.resume());
list.addEventListener("copy", ({ detail: [ channel, type ] }) => {
    controller.copyChannelURL(channel, type).then((channel) => {
        notifier.notifyCopied(channel.uname);
    });
});

// Wire things up

notifier.addEventListener("click", async ({ detail: channelId }) => {
    const channel = await controller.getChannel(channelId);
    selectOrOpenTab(channel);
});

controller.addEventListener("channelupdated", ({ detail: channel }) => {
    notifier.sendNotification(channel);
    list.onChannelChanged(channel);
});

controller.addEventListener("channelsadded", ({ detail: channels }) => {
    list.addChannels(channels);
    channels.forEach((channel) => notifier.sendNotification(channel));
});

controller.addEventListener("channeldeleted", ({ detail: channelId }) => {
    notifier.onChannelRemoved(channelId);
    list.removeChannel(channelId);
});

controller.addEventListener("beforechanneldeleted", () => qs.pause());
//TODO do counting instead of relying on randomness being in our favor ;)
controller.addEventListener("afterchanneldeleted", () => qs.resume());

prefs.get([
    "theme",
    "panel_nonlive",
    "updateInterval",
    "queue_ratio",
    "queue_maxRequestBatchSize"
]).then(([
    theme,
    nonlive,
    interval,
    ratio,
    batchSize
]) => {
    controller.setTheme(parseInt(theme, 10));
    list.setNonLiveDisplay(nonlive);
    qs.setOptions({
        interval: S_TO_MS_FACTOR * interval,
        amount: 1 / ratio,
        maxSize: batchSize
    });
});

qs.addListeners({
    paused: () => list.setQueuePaused(true),
    resumed: () => list.setQueuePaused(false)
});

prefs.addEventListener("change", ({ detail: { pref, value } }) => {
    if(pref == "manageChannels") {
        controller.showManager();
    }
    else if(pref == "theme") {
        const theme = parseInt(value, 10);
        controller.setTheme(theme);
        list.setTheme(theme);
    }
    else if(pref == "panel_nonlive") {
        list.setNonLiveDisplay(parseInt(value, 10));
    }
    else if(pref == "panel_extras") {
        list.setExtrasVisibility(value);
    }
    else if(pref == "panel_style") {
        list.setStyle(parseInt(value, 10));
    }
    else if(pref == "updateInterval") {
        const interval = parseInt(value, 10);
        qs.updateOptions(S_TO_MS_FACTOR * interval);
        list.setQueueStatus(interval !== 0);
    }
});

// Do migration of channel data and prefs if necessary
prefs.get("migrated").then((migrated) => {
    if(!migrated) {
        SDK.doAction("migrate-channels").then(([ channels, users ]) => {
            return Promise.all(users.map((user) => controller.addUser(user.login, user.type)))
                .then(() => Promise.all(channels.map((channel) => controller.addChannel(channel.login, channel.type))));
        }).then(() => {
            return browser.storage.local.set({
                migrated: true
            });
        });
        SDK.doAction("migrate-prefs").then((oldPrefs) => {
            Promise.all(Object.keys(oldPrefs).map((p) => {
                return prefs.set(p, oldPrefs[p]);
            }));
        });
    }
});

browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if((reason == 'install' || reason == 'update') && await prefs.get('updateTab')) {
        if(reason == 'install') {
            await browser.tabs.create({
                url: BASE_URL + "/firstrun/"
            });
        }
        else if(reason == 'update') {
            await browser.tabs.create({
                url: `${BASE_URL}/changes/${browser.runtime.getManifest().version}/`,
                active: false
            });
        }
    }
});
