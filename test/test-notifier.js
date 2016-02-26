/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo use channeluser/utils
 */

const requireHelper = require("./require_helper");
const { Channel } = requireHelper('../lib/channel/core');
const { getChannel } = require("./channeluser/utils");
const { prefs } = require("sdk/simple-prefs");
const { when } = require("sdk/event/utils");
const { defer } = require("sdk/core/promise");
const { cleanUI } = require("sdk/test/utils");
const channelUtils = requireHelper('../lib/channel/utils');
const mockAlertsService = require("./xpcom-mocks/alerts-service");

exports.testNotifierPrefs = function(assert) {
    const { Notifier } = requireHelper('../lib/notifier');
    const notifier = new Notifier({ onClick() {} });
    assert.equal(notifier.onlineNotifications, prefs.onlineNotification);
    assert.equal(notifier.titleNotifications, prefs.titleChangeNotification);
    assert.equal(notifier.offlineNotifications, prefs.offlineNotification);
};

exports.testNotifier = function*(assert) {
    const oldVal = prefs.offlineNotification;

    mockAlertsService.registerService();
    const { Notifier } = requireHelper('../lib/notifier');

    prefs.offlineNotification = true;

    const notifier = new Notifier({ onClick: function() {} });
    const channel = getChannel('test', 'test', 1);
    channel.live = true;

    assert.ok(!notifier.channelTitles.has(channel.id), "Channel is not in the title initially");

    let p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    assert.ok(notifier.channelTitles.has(channel.id), "Channel is added to the titles after notification");
    assert.equal(notifier.channelTitles.get(channel.id), channel.title, "Title matches");

    notifier.sendNotification(channel);

    channel.title = "Something else";
    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.equal(notifier.channelTitles.get(channel.id), channel.title, "title was updated");
    notifier.onChannelRemoved(channel.id);
    assert.ok(!notifier.channelTitles.has(channel.id), "Title was removed");

    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.ok(notifier.channelTitles.has(channel.id), "channel was added back");
    channel.live = false;
    p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;
    assert.ok(!notifier.channelTitles.has(channel.id), "channel is gone when it goes offline");

    const mapLength = notifier.channelTitles.length;
    notifier.onChannelRemoved(-1);
    assert.equal(notifier.channelTitles.length, mapLength);

    prefs.offlineNotification = oldVal;

    mockAlertsService.unregisterService();
};

exports.testMuteNotification = function*(assert) {
    mockAlertsService.registerService();
    let counter = 0;
    const { Notifier } = requireHelper('../lib/notifier');
    const notifier = new Notifier({ onClick() {}});
    const channel = getChannel('test', 'test', 1);
    channel.live = true;

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
    const { Notifier } = requireHelper('../lib/notifier');
    const notifier = new Notifier({ onClick(chan) { clickPromise.resolve(chan); }});
    const channel = getChannel('test', 'test', 1);
    channel.live = true;

    const p = when(mockAlertsService.getEventTarget(), "shownotification");
    notifier.sendNotification(channel);
    yield p;

    mockAlertsService.getLastListener().observe(null, "alertclickcallback", null);
    const lastChannel = yield clickPromise.promise;
    assert.deepEqual(lastChannel, channel, "The channel in the click callback is the same as in the notification");

    mockAlertsService.unregisterService();
};

require("sdk/test").run(exports);

