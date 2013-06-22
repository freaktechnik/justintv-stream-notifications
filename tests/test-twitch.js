var justintv = require('./twitch');
var baseprovider = require('./baseprovider');

exports['test checkResponse'] = function(test) {
    test.assertEqual(justintv.checkResponse({'status':403}),0,"403 Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':500}),2,"500 Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':0}),0,"Offline is detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'error':"a"}}),2,"json Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{}}),1,"correct responses are detected correctly");
};

exports['test Archive URL'] = function(test) {
    test.assert(justintv.archiveURL.contains("%u"));
};

exports['test response constructor'] = function(test) {
    test.waitUntilDone();
    var reqObj = justintv.getStatusRequest();
    test.assertEqual(typeof(reqObj.url),'string');
    test.assert(typeof reqObj.headers == "object" || !reqObj.headers);
    test.assert(typeof reqObj.content == "string" || typeof reqObj.content == "object" || !reqObj.content);
    test.assert(typeof reqObj.contentType == "string" || !reqObj.contentType);
    test.assert(typeof reqObj.overrideMimeType == "string" || !reqObj.overrideMimeType);
    test.done();
};

/*exports['test basic unified channel info'] = function(test) {
    test.waitUntilDone();
    var uniChObj = justintv.getBasicUniChannelInfo();
    test.assertEqual(uniChObj,baseprovider.channelInfo(),"Returns unified channel info");
};

exports['test basic unified channel info'] = function(test) {
    test.waitUntilDone();
    var uniChObj = justintv.getUnifiedChannelInfo({});
    test.assertEqual(uniChObj,baseprovider.channelInfo(),"Returns unified channel info");
    test.done();
};*/

exports['test favorites constructor'] = function(test) {
    test.waitUntilDone();
    var reqObj = justintv.getUserFavorites({'name':'lorem','page':0});
    test.assertEqual(typeof(reqObj.url),'string');
    test.assert(typeof reqObj.headers == "object" || !reqObj.headers);
    test.assert(typeof reqObj.content == "string" || typeof reqObj.content == "object" || !reqObj.content);
    test.assert(typeof reqObj.contentType == "string" || !reqObj.contentType);
    test.assert(typeof reqObj.overrideMimeType == "string" || !reqObj.overrideMimeType);
    test.done();
};

exports['test detail constructor'] = function(test) {
    test.waitUntilDone();
    var reqObj = justintv.getChannelDetails({'name':'ipsum'});
    test.assertEqual(typeof(reqObj.url),'string');
    test.assert(typeof reqObj.headers == "object" || !reqObj.headers);
    test.assert(typeof reqObj.content == "string" || typeof reqObj.content == "object" || !reqObj.content);
    test.assert(typeof reqObj.contentType == "string" || !reqObj.contentType);
    test.assert(typeof reqObj.overrideMimeType == "string" || !reqObj.overrideMimeType);
    test.done();
};