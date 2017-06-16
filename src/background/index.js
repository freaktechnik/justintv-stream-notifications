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
import * as qs from './queue/service';
import Notifier from "./notifier";
import prefInfo from '../prefs.json';
import Tour from './tour';

const S_TO_MS_FACTOR = 1000,

// Init things
    notifier = new Notifier(),
    controller = new ChannelController(),
    list = new ListView();

list.addEventListener("ready", () => {
    controller.getChannelsByType()
        .then((channels) => list.addChannels(channels));
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
list.addEventListener("copy", async ({ detail }) => {
    let copy;
    if(Array.isArray(detail)) {
        // login + type
        copy = await controller.copyableChannelURL(...detail);
    }
    else {
        // Channel ID
        copy = await controller.copyableChannelURL(detail);
    }
    list.copyChannelURL(copy, Array.isArray(detail));
});
list.addEventListener("copied", async ({ detail }) => {
    let channel;
    if(Array.isArray(detail)) {
        channel = await controller.getExternalChannel(...detail);
    }
    else {
        channel = await controller.getChannel(detail);
    }
    notifier.notifyCopied(channel.uname);
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
    "updateInterval",
    "queue_ratio",
    "queue_maxRequestBatchSize"
]).then(([
    interval,
    ratio,
    batchSize
]) => {
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

const usedPrefs = {
        "theme": [
            list.setTheme.bind(list),
            controller.setTheme.bind(controller)
        ],
        "panel_nonlive": [
            list.setNonLiveDisplay.bind(list)
        ],
        "panel_extras": [
            list.setExtrasVisibility.bind(list)
        ],
        "panel_style": [
            list.setStyle.bind(list)
        ],
        "updateInterval": [
            (interval) => list.setQueueStatus(interval !== 0)
        ]
    },
    upKeys = Object.keys(usedPrefs),
    applyValue = (p, v) => {
        if(prefInfo[p].type == "radio") {
            v = parseInt(v, 10);
        }
        for(const f of usedPrefs[p]) {
            f(v);
        }
    };

prefs.get(upKeys).then((values) => {
    for(const p in usedPrefs) {
        applyValue(p, values[upKeys.indexOf(p)]);
    }
});

prefs.addEventListener("change", ({ detail: { pref, value } }) => {
    if(pref == "updateInterval") {
        const interval = parseInt(value, 10);
        qs.updateOptions(S_TO_MS_FACTOR * interval);
    }
    if(pref in usedPrefs) {
        applyValue(pref, value);
    }
});

// Handle options page things.
browser.runtime.onMessage.addListener((message) => {
    if(message == "manageChannels") {
        controller.showManager();
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
/* (doesn't work in embedded webexts)
browser.runtime.onInstalled.addListener(({ reason }) => {
    if(reason == 'install') {
        return Tour.onInstalled();
    }
    else if(reason == 'update') {
        return Tour.onUpdate();
    }
});
(but this does...) */
SDK.doAction("load-reason").then((reason) => {
    if(reason == 'install') {
        return Tour.onInstalled();
    }
    else if(reason == 'upgrade') {
        return Tour.onUpdate();
    }
});
