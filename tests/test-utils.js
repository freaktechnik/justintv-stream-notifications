/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { exactArraySearch, randomDelayNumber } = require('../lib/utils');

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

