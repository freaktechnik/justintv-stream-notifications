var { Channel, ChannelList, Sources, Source, UpdateQueue } = require('./channellist');

exports['test channel url comparison'] = function(test) {
    var channel = getFullChannel();
    test.assert(channel.compareUrl('http://foo.bar'));
    test.assert(!channel.compareUrl('http://foo.bar/archive'));
    test.assert(!channel.compareUrl('http://asdf.com'));
};

// depends on source.getfirstSourceType()
exports['test first source object'] = function(test) {
    var source = getFullChannel().getFirstSourceObject();
    test.assertEqual(source.type,Source.TYPE_USER);
    test.assertEqual(source.name,Source.TYPE_USER);
    test.assertEqual(source.channelType,'justintv');
};

function getFullChannel() {
    return new Channel(Channel.FULL,new Source(Source.TYPE_USER,Source.TYPE_USER,'justintv'),{'channel_url':'http://foo.bar','title':'lorem ipsum','login':'test','image_url_tiny':'http://foo.bar/0.jpg',
                        'image_url_medium':'http://foo.bar/1.jpg','channel_background_color':'#ffffff','channel_text_color':'#000000','channel_link_color':'#cccccc'});
}

exports['test ChannelList enumeration'] = function(test) {
    test.waitUntilDone();
    var channels = createDummyChannelList().channels;
    var ok = true;
    for(var ch in channels) {
        test.assertEqual(channels[ch] instanceof Channel,true,"ChannelList.channels property is a Channel");
    }
    test.done();
};

exports['test ChannelList length property'] = function(test) {
    test.waitUntilDone();
    var channels = createDummyChannelList().channels;
    test.assertEqual(new ChannelList().channels.length,0,"ChannelList.channels length is initialized correctly");
    test.assertEqual(channels.propertyIsEnumerable('length'),false,"ChannelList.channels length property isn't enumerable");
    test.assertEqual(channels.length,2,"ChannelList.channels length gets extended correctly");
    test.done();
};

function createDummyChannelList() {
    var list = new ChannelList();
    list.addChannel({'login':'someChannel','channel_url':'http://twitch.tv/freaktechnik','title':'just a channel','image_url_tiny':'','image_url_medium':''},
                    new Source(Source.TYPE_USERNAME,'someChannel','justintv'),true);
    list.addChannel({'login':'yetAnotherChannel','channel_url':'http://twitch.tv/freaktechnik','title':'just another channel','image_url_tiny':'','image_url_medium':''},
                    new Source(Source.TYPE_USERNAME,'yetAnotherChannel','justintv'),true);
    return list;
}

exports['test adding new request to queue'] = function(test) {
    var q = new UpdateQueue();
    var i = q.addRequest({})
    test.assertEqual(i,1);
    test.assertEqual(i,q.queue[0].id);
    test.assertEqual(typeof(q.queue[0]),'object');
};