/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test non-live stuff
 */

const requireHelper = require("./require_helper");
const { getChannel } = require("./channeluser/utils");
const { prefs } = require("sdk/simple-prefs");
const { when } = require("sdk/event/utils");
const { defer } = require("sdk/core/promise");
const { cleanUI } = require("sdk/test/utils");
const channelUtils = requireHelper('../lib/channel/utils');
const mockAlertsService = require("./xpcom-mocks/alerts-service");
const LiveState = requireHelper('../lib/channel/live-state').default;

exports.testNotifierPrefs = function(assert) {
    const Notifier = requireHelper('../lib/notifier').default;
    const notifier = new Notifier({ onClick() {} });
    assert.equal(notifier.onlineNotifications, prefs.onlineNotification, "Value for online matches the pref");
    assert.equal(notifier.titleNotifications, prefs.titleChangeNotification, "Value for title changes matches the pref");
    assert.equal(notifier.offlineNotifications, prefs.offlineNotification, "Value for offline matches the pref");
    assert.equal(notifier.nonliveNotifications, prefs.nonliveNotification, "Nonlive notifications vlaue matches the pref");
};

exports.testShowNotifications = function(assert) {
    const Notifier = requireHelper('../lib/notifier').default;
    const notifier = new Notifier({ onClick() {} });

    const prevPrefs = {
        online: prefs.onlineNotification,
        title: prefs.titleChangeNotification,
        offline: prefs.offlineNotification,
        nonlive: prefs.nonliveNotification
    };

    prefs.onlineNotification = false;
    prefs.titleChangeNotification = false;
    prefs.offlineNotification = false;
    prefs.nonliveNotification = false;

    assert.ok(!notifier.showNotifications, "No notifications should be shown if all of them are disabled");

    prefs.onlineNotification = true;
    assert.ok(notifier.showNotifications, "If online is true, notifications are shown");

    prefs.onlineNotification = false;
    prefs.titleChangeNotification = true;
    assert.ok(notifier.showNotifications, "If title change is enabled, notifications are shown");

    prefs.titleChangeNotification = false;
    prefs.offlineNotification = true;
    assert.ok(notifier.showNotifications, "If offline is enabled, notifications are shown");

    prefs.offlineNotification = false;
    prefs.nonliveNotification = true;
    assert.ok(notifier.showNotifications, "If nonlive is enabled, notifications are shown");

    prefs.onlineNotifications = prevPrefs.online;
    prefs.titleChangeNotification = prevPrefs.title;
    prefs.offlineNotification = prevPrefs.offline;
    prefs.nonliveNotification = prevPrefs.nonlive;
};

exports.testNonLiveNotifications = function*(assert) {
    const oldVal = prefs.nonliveNotification;
    prefs.nonliveNotification = true;

    mockAlertsService.registerService();
    const Notifier = requireHelper('../lib/notifier').default;

    const notifier = new Notifier({ onClick() {} });
    const channel = getChannel('test', 'test', 1);
    channel.live = new LiveState(LiveState.REDIRECT);

    let p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    channel.live = new LiveState(LiveState.REBROADCAST);

    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    notifier.onChannelRemoved(channel.id);

    prefs.nonliveNotification = oldVal;
    mockAlertsService.unregisterService();
};

exports.testNotifier = function*(assert) {
    const oldVal = prefs.offlineNotification;

    mockAlertsService.registerService();
    const Notifier = requireHelper('../lib/notifier').default;

    prefs.offlineNotification = true;

    const notifier = new Notifier({ onClick: function() {} });
    const channel = getChannel('test', 'test', 1);
    channel.live.setLive(true);

    assert.ok(!notifier.channelTitles.has(channel.id), "Channel is not in the title initially");

    let p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    assert.ok(notifier.channelTitles.has(channel.id), "Channel is added to the titles after notification");
    assert.equal(notifier.channelTitles.get(channel.id), channel.title, "Title matches");
    assert.ok(notifier.channelStates.has(channel.id), "Channel state is recorded after notification");

    notifier.sendNotification(channel);

    channel.title = "Something else";
    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.equal(notifier.channelTitles.get(channel.id), channel.title, "title was updated");
    notifier.onChannelRemoved(channel.id);
    assert.ok(!notifier.channelTitles.has(channel.id), "Title was removed");
    assert.ok(!notifier.channelStates.has(channel.id), "State was removed");

    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.ok(notifier.channelTitles.has(channel.id), "channel was added back");
    assert.ok(notifier.channelStates.has(channel.id), "channel state was added back");
    channel.live.setLive(false);
    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.ok(!notifier.channelTitles.has(channel.id), "channel is gone when it goes offline");
    assert.ok(notifier.channelStates.has(channel.id), "Channel state still exists after going offline");

    const mapLength = notifier.channelTitles.length;
    notifier.onChannelRemoved(-1);
    assert.equal(notifier.channelTitles.length, mapLength);

    prefs.offlineNotification = oldVal;

    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.notifyCopied("test");
    yield p;

    mockAlertsService.unregisterService();
};

exports.testMuteNotification = function*(assert) {
    mockAlertsService.registerService();
    let counter = 0;
    const Notifier = requireHelper('../lib/notifier').default;
    const notifier = new Notifier({ onClick() {}});
    const channel = getChannel('test', 'test', 1);
    channel.live.setLive(true);

    mockAlertsService.getEventTarget().on("shownotification", () => ++counter);

    yield channelUtils.selectOrOpenTab(channel);
    notifier.sendNotification(channel);

    assert.ok(notifier.channelTitles.has(channel.id));
    assert.strictEqual(counter, 0, "No notifications were shown");

    mockAlertsService.unregisterService();
    yield cleanUI();
};

exports.testClickListener = function*(assert) {
    let clickPromise = defer();
    mockAlertsService.registerService();
    const Notifier = requireHelper('../lib/notifier').default;
    const notifier = new Notifier({ onClick(chan) { clickPromise.resolve(chan); }});
    const channel = getChannel('test', 'test', 1);
    channel.live.setLive(true);

    const p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    mockAlertsService.getLastListener().observe(null, "alertclickcallback", null);
    const lastChannel = yield clickPromise.promise;
    assert.deepEqual(lastChannel, channel, "The channel in the click callback is the same as in the notification");

    mockAlertsService.unregisterService();
};

require("sdk/test").run(exports);

