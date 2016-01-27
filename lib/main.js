/**
 * Controller of the extension
 * @author Martin Giger
 * @license MPL-2.0
 * @module main
 */

"use strict";

var prefs = require('sdk/simple-prefs'),
    self = require('sdk/self'),
    tabs = require('sdk/tabs');

const { ListView } = require('./list'),
      { Notifier } = require('./notifier'),
      qs = require('./queue/service');
const um = require('./update-manager');
const { selectOrOpenTab } = require('./channel/utils');
const { ChannelController } = require("./channel/controller");
const serializedProviders = require("./providers/serialized");
const providers = require("./providers");

const BASE_URL = "http://streamnotifier.ch";
const S_TO_MS_FACTOR = 1000;

// setup objects and events
var view = new ListView(false, parseInt(prefs.prefs.panel_style, 10),
                        prefs.prefs.panel_extras, providers, {
        onOpencm() {
            controller.showManager();
        },
        onAddchannel(type, login) {
            controller.addChannel(login, type);
        },
        onReady() {
            controller.getChannelsByType()
                .then((channels) => view.addChannels(channels));

            view.setProviders(serializedProviders);
            view.setQueueStatus(prefs.prefs.updateInterval !== 0);
        },
        onRefresh(channelId) {
            if(channelId)
                controller.updateChannel(channelId);
            else
                controller.updateChannels();
        },
        onOpen(channelId, what) {
            let p;
            if(typeof channelId === "string") {
                p = Promise.resolve({
                    url: [channelId],
                    live: true
                });
            }
            else {
                p = controller.getChannel(channelId);
            }

            p.then((channel) => selectOrOpenTab(channel, what));
        },
        onPause() {
            um.pause();
        },
        onResume() {
            um.resume();
        }
    }),
    notifier = new Notifier({
        onClick(channel) {
            selectOrOpenTab(channel);
        }
    }),
    controller = new ChannelController({
        onChannelupdated(channel) {
            notifier.sendNotification(channel);
            view.onChannelChanged(channel);
        },
        onChannelsadded(channels) {
            channels.filter((chan) => chan.live).forEach((channel) => {
                notifier.sendNotification(channel);
            });
            view.addChannels(channels);
        },
        onBeforechanneldeleted(channelId) {
            qs.pause();
        },
        onChanneldeleted(channelId) {
            notifier.onChannelRemoved(channelId);
            view.removeChannel(channelId);
        },
        onAfterchannelsdeleted() {
            //TODO do counting instead of relying on randomness being in our favor ;)
            qs.resume();
        }
    });

qs.setOptions({
    interval: S_TO_MS_FACTOR * prefs.prefs.updateInterval,
    amount:   1 / prefs.prefs.queue_ratio,
    maxSize:  prefs.prefs.queue_maxRequestBatchSize
});

um.on("pause", () => view.setQueuePaused(true));
um.on("resume", () => view.setQueuePaused(false));

// Preference change listeners
prefs.on("manageChannels", () => controller.showManager());

prefs.on("updateInterval", () => {
    qs.updateOptions(S_TO_MS_FACTOR * prefs.prefs.updateInterval);
    view.setQueueStatus(prefs.prefs.updateInterval !== 0);
});

prefs.on("panel_style", () => {
    view.setStyle(parseInt(prefs.prefs.panel_style, 10));
});

prefs.on("panel_extras", () => {
    view.setExtrasVisibility(prefs.prefs.panel_extras);
});

// extension installation/upgrade stuff
if(self.loadReason == "install" && prefs.prefs.updateTab) {
    tabs.open({url: BASE_URL + "/firstrun/"});
}
else if(self.loadReason == "upgrade" && prefs.prefs.updateTab) {
    tabs.open({
        url: BASE_URL + "/changes/" + self.version + "/",
        inBackground: true
    });
}

