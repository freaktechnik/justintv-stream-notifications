/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test non-live stuff
 */
import test from 'ava';
import { getChannel } from "../helpers/channel-user";
import LiveState from '../../src/background/channel/live-state';
import Notifier from '../../src/background/notifier';
import defaultPrefs from '../../src/prefs.json';
import { when } from '../../src/utils';

const PREFS = {
        live: 'onlineNotification',
        title: 'titleChangeNotification',
        offline: 'offlineNotification',
        nonlive: 'nonliveNotification'
    },
    applyPrefs = (oldPrefs) => {
        for(const p in oldPrefs) {
            browser.storage.local.get.withArgs(PREFS[p]).returns(Promise.resolve({
                [PREFS[p]]: oldPrefs[p]
            }));
        }
    },
    getChannelFromFixture = (p) => {
        const chan = getChannel(p.username);
        chan.title = p.title;
        chan.live = LiveState.deserialize(p.live);
        return chan;
    },
    resetPrefs = () => {
        browser.storage.local.get.reset();
        browser.storage.local.get.returns(Promise.resolve({}));
    };

const testNotifierNotifications = async (t, f) => {
    const n = new Notifier();
    applyPrefs(f.prefs);
    await Promise.all(f.initial.map((c) => n.sendNotification(getChannelFromFixture(c))));

    browser.notifications.create.reset();
    await Promise.all(f.updated.map((c) => n.sendNotification(getChannelFromFixture(c))));

    //TODO check if the correct notification is shown
    if(f.expected != "none") {
        t.true(browser.notifications.create.called, `expect a ${f.expected} notification`);
        //TODO check if the correct amount of notifications was shown.
    }
    else {
        t.true(browser.notifications.create.notCalled, 'no notification shown');
    }
};
testNotifierNotifications.title = (title, fixture) => `${title} with a ${fixture.expected} notification`;

test("Prefs", async (t) => {
    const notifier = new Notifier();
    t.is(await notifier.onlineNotifications(), defaultPrefs.onlineNotification.value, "Value for online matches the pref");
    t.is(await notifier.titleNotifications(), defaultPrefs.titleChangeNotification.value, "Value for title changes matches the pref");
    t.is(await notifier.offlineNotifications(), defaultPrefs.offlineNotification.value, "Value for offline matches the pref");
    t.is(await notifier.nonliveNotifications(), defaultPrefs.nonliveNotification.value, "Nonlive notifications vlaue matches the pref");
});

test.serial("Show Notifications prefs", async (t) => {
    const notifier = new Notifier();

    applyPrefs({
        live: false,
        title: false,
        offline: false,
        nonlive: false
    });

    t.false(await notifier.showNotifications(), "No notifications should be shown if all of them are disabled");

    browser.storage.local.get.withArgs("onlineNotification").returns(Promise.resolve({
        onlineNotification: true
    }));
    t.true(await notifier.showNotifications(), "If online is true, notifications are shown");

    browser.storage.local.get.withArgs("onlineNotification").returns(Promise.resolve({
        onlineNotification: false
    }));
    browser.storage.local.get.withArgs("titleChangeNotification").returns(Promise.resolve({
        titleChangeNotification: true
    }));
    t.true(await notifier.showNotifications(), "If title change is enabled, notifications are shown");

    browser.storage.local.get.withArgs("titleChangeNotification").returns(Promise.resolve({
        titleChangeNotification: false
    }));
    browser.storage.local.get.withArgs("offlineNotification").returns(Promise.resolve({
        offlineNotification: true
    }));
    t.true(await notifier.showNotifications(), "If offline is enabled, notifications are shown");

    browser.storage.local.get.withArgs("offlineNotification").returns(Promise.resolve({
        offlineNotification: false
    }));
    browser.storage.local.get.withArgs("nonliveNotification").returns(Promise.resolve({
        nonliveNotification: true
    }));
    t.true(await notifier.showNotifications(), "If nonlive is enabled, notifications are shown");
});

test.serial("Non-live Notifications", async (t) => {
    browser.notifications.create.reset();
    browser.storage.local.get.withArgs("nonliveNotification").returns(Promise.resolve({
        nonliveNotification: true
    }));

    const notifier = new Notifier(),
        channel = getChannel('test', 'test', 1);
    channel.live = new LiveState(LiveState.REDIRECT);

    await notifier.sendNotification(channel);
    t.true(browser.notifications.create.calledOnce);
    //TODO test contents

    channel.live = new LiveState(LiveState.REBROADCAST);

    await notifier.sendNotification(channel);
    t.true(browser.notifications.create.calledTwice);

    notifier.onChannelRemoved(channel.id);
});

test.serial("Notifier", async (t) => {
    browser.notifications.create.reset();
    applyPrefs({
        live: true,
        title: true,
        offline: true,
        nonlive: false
    });
    const notifier = new Notifier(),
        channel = getChannel('test', 'test', 1);
    channel.live.setLive(true);

    t.false(notifier.channelTitles.has(channel.id), "Channel is not in the title initially");

    await notifier.sendNotification(channel);
    t.true(browser.notifications.create.calledOnce);

    t.true(notifier.channelTitles.has(channel.id), "Channel is added to the titles after notification");
    t.is(notifier.channelTitles.get(channel.id), channel.title, "Title matches");
    t.true(notifier.channelStates.has(channel.id), "Channel state is recorded after notification");

    await notifier.sendNotification(channel);

    t.true(browser.notifications.create.calledOnce);

    channel.title = "Something else";
    await notifier.sendNotification(channel);
    t.true(browser.notifications.create.calledTwice);
    t.is(notifier.channelTitles.get(channel.id), channel.title, "title was updated");
    notifier.onChannelRemoved(channel.id);
    t.false(notifier.channelTitles.has(channel.id), "Title was removed");
    t.false(notifier.channelStates.has(channel.id), "State was removed");

    await notifier.sendNotification(channel);
    t.true(browser.notifications.create.calledThrice);
    t.true(notifier.channelTitles.has(channel.id), "channel was added back");
    t.true(notifier.channelStates.has(channel.id), "channel state was added back");
    channel.live.setLive(false);
    await notifier.sendNotification(channel);
    t.is(browser.notifications.create.callCount, 4);
    t.false(notifier.channelTitles.has(channel.id), "channel is gone when it goes offline");
    t.true(notifier.channelStates.has(channel.id), "Channel state still exists after going offline");

    const mapLength = notifier.channelTitles.length;
    notifier.onChannelRemoved(-1);
    t.is(notifier.channelTitles.length, mapLength);

    notifier.notifyCopied("test");
    t.is(browser.notifications.create.callCount, 5);
});

test.serial("Mute Notification", async (t) => {
    browser.notifications.create.reset();
    const notifier = new Notifier(),
        channel = getChannel('test', 'test', 1);
    channel.live.setLive(true);

    browser.tabs.query.returns(Promise.resolve([
        {
            url: "https://example.com"
        }
    ]));

    await notifier.sendNotification(channel);

    t.true(notifier.channelTitles.has(channel.id));
    t.true(browser.notifications.create.notCalled, "No notifications were shown");
});

test("Click Listener", async (t) => {
    const notifier = new Notifier(),
        channel = getChannel('test', 'test', 1);

    const p = when(notifier, 'click');

    browser.notifications.onClicked.dispatch("cn" + channel.id);
    const { detail: channelId } = await p;
    t.is(channelId, channel.id);
});

test.beforeEach(() => {
    browser.tabs.query.returns(Promise.resolve([]));
    resetPrefs();
});

const fixture = [
    {
        prefs: {
            live: true,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "live"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: true,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "live"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: true
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "title"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: true,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        expected: "offline"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: true,
            title: false
        },
        initial: [],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: true,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "nonlive"
    },
    {
        prefs: {
            live: false,
            nonlive: false,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "none"
    },
    {
        prefs: {
            live: false,
            nonlive: true,
            offline: false,
            title: false
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.OFFLINE
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "nonlive"
    },
    {
        prefs: {
            live: false,
            nonlive: true,
            offline: false,
            title: true
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "title"
    },
    {
        prefs: {
            live: false,
            nonlive: true,
            offline: false,
            title: true
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "foo"
                }
            }
        ],
        updated: [
            {
                title: "bar",
                live: {
                    state: LiveState.REDIRECT,
                    alternateUsername: "bar"
                }
            }
        ],
        expected: "nonlive"
    },
    {
        prefs: {
            live: true,
            nonlive: false,
            offline: false,
            title: true
        },
        initial: [
            {
                title: "foo",
                live: {
                    state: LiveState.REBROADCAST
                }
            }
        ],
        updated: [
            {
                title: "foo",
                live: {
                    state: LiveState.LIVE
                }
            }
        ],
        expected: "live"
    }
];
for(const f of fixture) {
    test.serial('notification visibility', testNotifierNotifications, f);
}
