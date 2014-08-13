var { exactArraySearch, randomDelayNumber, RequestQueue } = require('../lib/utils');

exports['test exactArraySearch'] = function(test) {
    test.assert(exactArraySearch([1,2,3,4],1));
    test.assert(exactArraySearch(['1','2','3','4'],'1'));
    test.assert(!exactArraySearch([1,2,3,4],0));
    test.assert(exactArraySearch([1,2,3,4],1),false);
    test.assert(!exactArraySearch([1,2,3,4],1,true));
    test.assert(!exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a'));
    test.assert(exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a',true));
};

exports['test randomDelayNumber'] = function(test) {
    test.waitUntilDone();
    
    var first;
    for(var i = 0; i<100; i++) {
        first = randomDelayNumber();
        test.assertEqual(typeof(first),'number');
        test.assert(first>100);
        test.assert(first<115);
    }
    test.done();
};

exports['test adding new request to queue'] = function(test) {
    var q = new RequestQueue();
    var i = q.addRequest({})
    test.assertEqual(i,1);
    test.assertEqual(i,q.queue[0].id);
    test.assertEqual(typeof(q.queue[0]),'object');
};

exports['test get request index'] = function(test) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    test.assertEqual(q.getRequestIndex(i),0);
    test.assertEqual(q.getRequestIndex(0),-1);
};

exports['test request queued'] = function(test) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    test.assert(q.requestQueued(i));
    test.assert(!q.requestQueued(0));
};

exports['test removing requests'] = function(test) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    q.removeRequest(i);
    test.assert(!q.requestQueued(i));
};

exports['test autofetch'] = function(test) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    test.assert(!!q._intervalID);
    q.clear();
};

exports['test working on queue'] = function(test) {
    var q = new RequestQueue();
    test.assert(!q.workingOnQueue());
    q.addRequest({});
    test.assert(!q.workingOnQueue());
    q.autoFetch(1000000,0.5,10);
    test.assert(q.workingOnQueue());
    q.clear();
};

exports['test interval changing'] = function(test) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    var oldId = q._intervalID;
    q.changeInterval(1000,0.5,10);
    test.assert(q._intervalID!=oldId);
    q.clear();
};

exports['test queue clearing'] = function(test) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(100000,0.1,500);
    q.clear();
    test.assertEqual(q.queue.length,0);
    test.assert(!q.workingOnQueue());
};