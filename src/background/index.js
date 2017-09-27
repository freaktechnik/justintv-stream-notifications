// Load vendor deps
import 'file-loader?name=vendor/[name].[ext]!lodash/lodash.min.js';
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
import { selectOrOpenTab } from "./channel/utils";
import ChannelController from "./channel/controller";
import prefs from '../preferences';
import LiveState from './channel/live-state';
import ListView from './list';
import * as qs from './queue/service';
import Notifier from "./notifier";
import prefInfo from '../prefs.json';
import Tour from './tour';
import ParentalControls from './parental-controls';
import { errorStateManager } from './error-state';
import importFile from './import';

const qsPause = () => qs.pause(),
    qsResume = () => qs.resume(),
    // Init things
    notifier = new Notifier(),
    controller = new ChannelController(),
    list = new ListView(),
    usedPrefs = {
        "theme": [
            controller.setTheme.bind(controller)
        ],
        "panel_nonlive": [
            list.setNonLiveDisplay.bind(list)
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

errorStateManager.addEventListener("register", qsPause, {
    capture: false,
    passive: true
});

errorStateManager.addEventListener("empty", () => {
    qs.resume();
    list.updateBadge();
}, {
    capture: false,
    passive: true
});

list.addEventListener("opencm", () => controller.showManager());
list.addEventListener("addchannel", ({ detail: [ login, type ] }) => {
    controller.addChannel(login, type);
});
list.addEventListener("remove", ({ detail: channelId }) => {
    controller.removeChannel(channelId);
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
list.addEventListener("pause", qsPause);
list.addEventListener("resume", qsResume);
list.addEventListener("copied", async ({ detail }) => {
    notifier.notifyCopied(detail);
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

controller.addEventListener("beforechanneldeleted", qsPause);
//TODO do counting instead of relying on randomness being in our favor ;)
controller.addEventListener("afterchannelsdeleted", qsResume);

qs.addListeners({
    paused: () => list.setQueuePaused(true),
    resumed: () => list.setQueuePaused(false)
});

prefs.get(upKeys).then((values) => {
    for(const p in usedPrefs) {
        applyValue(p, values[upKeys.indexOf(p)]);
    }
});

prefs.addEventListener("change", ({ detail: { pref, value } }) => {
    if(pref in usedPrefs) {
        applyValue(pref, value);
    }
});

// Handle options page things.
browser.runtime.onMessage.addListener((message) => {
    if(message === "manageChannels") {
        controller.showManager();
    }
    else if(message === "resetPrefs") {
        return prefs.reset().then(() => 'reset');
    }
    else if(message === "pcStatus") {
        return Promise.resolve(ParentalControls.enabled);
    }
    else if(message.command === "import") {
        return importFile(message.payload, controller);
    }
});

browser.runtime.onInstalled.addListener(({ reason, temporary = false }) => {
    if(reason == 'install' && !temporary) {
        Tour.onInstalled();
    }
    else if(reason == 'update') {
        Tour.onUpdate();
        // Update to 3.5.0:
        prefs.get('panel_nonlive').then((value) => {
            if(value > 0) {
                prefs.set('panel_nonlive', value - 1);
            }
        });
    }
});

controller.getChannelsByType().then((channels) => list.addChannels(channels)).catch(console.error);
