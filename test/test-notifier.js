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

exports.testNotifierPrefs = function(assert) {
    let notifier = new Notifier();
    assert.equal(notifier.onlineNotifications, prefs.onlineNotification);
    assert.equal(notifier.titleNotifications, prefs.titleChangeNotification);
    assert.equal(notifier.offlineNotifications, prefs.offlineNotification);
};

//TODO check if notifications are sent (observer?)
exports.testNotifier = function(assert) {
    let oldVal = prefs.offlineNotification;
    prefs.offlineNotification = true;

    let notifier = new Notifier();
    var channel = getChannel();
    channel.live = true;
    channel.id = 1;

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

    let mapLength = notifier.channelTitles.length;
    notifier.onChannelRemoved(-1);
    assert.equal(notifier.channelTitles.length, mapLength);

    prefs.offlineNotification = oldVal;
};

require("sdk/test").run(exports);

