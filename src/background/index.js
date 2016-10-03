import Notifier from "./notifier";
import SDK from "./sdk";
import { selectOrOpenTab } from "./channel/utils";
import ChannelController from "./channel/controller";
import prefs from './preferences';
import LiveState from './channel/live-state';
import ListView from './list';
import serializedProviders from "./providers/serialized";
import * as qs from './queue/service';

const PASSIVE_LISTENER = { passive: true },
    S_TO_MS_FACTOR = 1000;

// Init things

const notifier = new Notifier(),
    controller = new ChannelController(),
    list = new ListView();

console.log("Constructed list");

list.addEventListener("ready", () => {
    controller.getChannelsByType()
        .then((channels) => list.addChannels(channels));

    list.setProviders(serializedProviders);

    prefs.get([
        "updateInterval",
        "panel_style",
        "panel_extras",
        "theme"
    ]).then(([ updateInterval, style, extras, theme ]) => {
        list.setQueueStatus(parseInt(updateInterval, 10) !== 0);
        list.setStyle(parseInt(style, 10));
        list.setExtrasVisibility(extras);
        list.setTheme(parseInt(theme, 10));
    });
}, PASSIVE_LISTENER);

list.addEventListener("opencm", () => controller.showManager(), PASSIVE_LISTENER);
list.addEventListener("addchannel", ({ detail: [ login, type ] }) => {
    controller.addChannel(login, type);
}, PASSIVE_LISTENER);
list.addEventListener("refresh", ({ detail: channelId }) => {
    if(channelId) {
        controller.updateChannel(channelId);
    }
    else {
        controller.updateChannels();
    }
}, PASSIVE_LISTENER);
list.addEventListener("open", ({ detail: [ channelId, what ] }) => {
    let p;
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
}, PASSIVE_LISTENER);
list.addEventListener("pause", () => qs.pause(), PASSIVE_LISTENER);
list.addEventListener("resume", () => qs.resume(), PASSIVE_LISTENER);
list.addEventListener("copy", ({ detail: [ channel, type ] }) => {
    controller.copyChannelURL(channel, type).then((channel) => {
        notifier.notifyCopied(channel.uname);
    });
});

// Wire things up

notifier.addEventListener("click", async ({ detail: channelId }) => {
    const channel = await controller.getChannel(channelId);
    selectOrOpenTab(channel);
}, PASSIVE_LISTENER);

controller.addEventListener("channelupdated", ({ detail: channel }) => {
    notifier.sendNotification(channel);
    list.onChannelChanged(channel);
}, PASSIVE_LISTENER);

controller.addEventListener("channelsadded", ({ detail: channels }) => {
    list.addChannels(channels);
    channels.forEach((channel) => notifier.sendNotification(channel));
}, PASSIVE_LISTENER);

controller.addEventListener("channeldeleted", ({ detail: channelId }) => {
    notifier.onChannelRemoved(channelId);
    list.removeChannel(channelId);
}, PASSIVE_LISTENER);

controller.addEventListener("beforechanneldeleted", () => qs.pause(), PASSIVE_LISTENER);
//TODO do counting instead of relying on randomness being in our favor ;)
controller.addEventListener("afterchanneldeleted", () => qs.resume(), PASSIVE_LISTENER);

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
}, PASSIVE_LISTENER);

// Do migration of channel data if necessary
browser.storage.local.get("migrated").then((value) => {
    if(!value.migrated) {
        SDK.doAction("migrate-channels").then(([ channels, users ]) => {
            return Promise.all(users.map((user) => controller.addUser(user.login, user.type)))
                .then(() => Promise.all(channels.map((channel) => controller.addChannel(channel.login, channel.type))));
        }).then(() => {
            return browser.storage.local.set({
                migrated: true
            });
        });
    }
});
