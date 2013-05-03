var justintv = require('./justintv');
var { Request } = require('sdk/request');

exports['test checkResponse'] = function(test) {
    test.assertEqual(justintv.checkResponse({'status':403}),0,"403 Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':500}),2,"500 Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':0}),0,"Offline is detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'error':"couldn't find user"}}),0,"json user Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'error':"couldn't find channel"}}),0,"json channel Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'error':"a"}}),2,"other json Errors are detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'127.0.0.1 is ratelimitted'}}),2,"Ratelimit is detected correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'199.9.248.0 is ratelimitted'}}),1,"Justin.tv API bug is ignored correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'199.9.248.255 is ratelimitted'}}),1,"Justin.tv API bug is ignored correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'199.9.249.0 is ratelimitted'}}),1,"Justin.tv API bug is ignored correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'199.9.251.0 is ratelimitted'}}),1,"Justin.tv API bug is ignored correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':true,'message':'199.9.255.255 is ratelimitted'}}),1,"Justin.tv API bug is ignored correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':false,'message':'199.9.255.255 is not ratelimitted'}}),1,"Ratelimit is handled correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{'rate_limited':false,'message':'127.0.0.1 is not ratelimitted'}}),1,"Ratelimit is handled correctly");
    test.assertEqual(justintv.checkResponse({'status':200,'json':{}}),1,"correct responses are detected correctly");
};

exports['test Archive URL'] = function(test) {
    test.assert(justintv.archiveURL.contains("%u"));
};

exports['test response constructor'] = function(test) {
    test.waitUntilDone();
    var reqObj = justintv.getRequestObject();
    test.assertEqual(typeof(reqObj.url),'string');
    test.assert(typeof reqObj.headers == "object" || !reqObj.headers);
    test.assert(typeof reqObj.content == "string" || typeof reqObj.content == "object" || !reqObj.content);
    test.assert(typeof reqObj.contentType == "string" || !reqObj.contentType);
    test.assert(typeof reqObj.overrideMimeType == "string" || !reqObj.overrideMimeType);
    test.done();
};