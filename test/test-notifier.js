/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo use channeluser/utils
 */

const requireHelper = require("./require_helper");
const { Notifier } = requireHelper('../lib/notifier'),
      { Channel } = requireHelper('../lib/channel/core');
const { getChannel } = require("./channeluser/utils");
const { prefs} = require("sdk/simple-prefs");
const { cleanUI } = require("sdk/test/utils");
const channelUtils = requireHelper('../lib/channel/utils');

//TODO temporarily replace notification service with one that sends events and maybe simulates clicks.

exports.testNotifierPrefs = function(assert) {
    const notifier = new Notifier({ onClick: function() {} });
    assert.equal(notifier.onlineNotifications, prefs.onlineNotification);
    assert.equal(notifier.titleNotifications, prefs.titleChangeNotification);
    assert.equal(notifier.offlineNotifications, prefs.offlineNotification);
};

exports.testNotifier = function*(assert) {
    const oldVal = prefs.offlineNotification;
    prefs.offlineNotification = true;

    const notifier = new Notifier({ onClick: function() {} });
    const channel = getChannel('test', 'test', 1);
    channel.live = true;

    assert.ok(!notifier.channelTitles.has(channel.id));

    notifier.sendNotification(channel);

    assert.ok(notifier.channelTitles.has(channel.id));
    assert.equal(notifier.channelTitles.get(channel.id), channel.title);
    notifier.sendNotification(channel);

    channel.title = "Something else";
    notifier.sendNotification(channel);
    assert.equal(notifier.channelTitles.get(channel.id), channel.title);
    notifier.onChannelRemoved(channel.id);
    assert.ok(!notifier.channelTitles.has(channel.id));

    notifier.sendNotification(channel);
    assert.ok(notifier.channelTitles.has(channel.id));
    channel.live = false;
    notifier.sendNotification(channel);
    assert.ok(!notifier.channelTitles.has(channel.id));

    const mapLength = notifier.channelTitles.length;
    notifier.onChannelRemoved(-1);
    assert.equal(notifier.channelTitles.length, mapLength);

    prefs.offlineNotification = oldVal;

    // close all notifications that are still open (on systems without native notifications)
    yield cleanUI();
};

exports.testMuteNotification = function*(assert) {
    const notifier = new Notifier({ onClick: () => {}});
    const channel = getChannel('test', 'test', 1);
    channel.live = true;

    yield channelUtils.selectOrOpenTab(channel);
    notifier.sendNotification(channel);

    assert.ok(notifier.channelTitles.has(channel.id));

    yield cleanUI();
};

require("sdk/test").run(exports);

