/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo use channeluser/utils
 */

const requireHelper = require("./require_helper");
const { Notifier } = requireHelper('../lib/notifier'),
      { Channel } = requireHelper('../lib/channeluser');


function getChannel() {
    var channel = new Channel();
    channel.type = "test";
    channel.url.push('http://foo.bar/lorem');
    channel.archiveUrl = 'http://foo.bar/lorem/archive';
    channel.uname='lorem ipsum';
    channel.login='test';
    channel.logo={'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    channel.title="Lorem Ipsum, dolor sit amet";
    return channel;
}

exports.testNotifier = function(assert) {
    let notifier = new Notifier({ onlineNotifications: false,
                                  titleNotifications: false,
                                  offlineNotifications: false
                                });
    var channel = getChannel();
    channel.live = true;
    channel.id = 1;
    assert.ok(!notifier.channelTitles.has(channel.id));
    notifier.sendNotification(channel);
    assert.ok(notifier.channelTitles.has(channel.id));
    assert.equal(notifier.channelTitles.get(channel.id), channel.title);
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
};

require("sdk/test").run(exports);

