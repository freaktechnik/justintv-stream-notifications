/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { exactArraySearch, randomDelayNumber } = require('../lib/utils');

exports['test exactArraySearch'] = function(assert) {
    assert.ok(exactArraySearch([1,2,3,4],1));
    assert.ok(exactArraySearch(['1','2','3','4'],'1'));
    assert.ok(!exactArraySearch([1,2,3,4],0));
    assert.ok(exactArraySearch([1,2,3,4],1),false);
    assert.ok(!exactArraySearch([1,2,3,4],1,true));
    assert.ok(!exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a'));
    assert.ok(exactArraySearch([{'login':'a'},{'login':'b'},{'login':'c'},{'login':'d'}],'a',true));
};

exports['test randomDelayNumber'] = function(assert, done) {    
    var first;
    for(var i = 0; i<100; i++) {
        first = randomDelayNumber();
        assert.equal(typeof(first),'number');
        assert.ok(first>100);
        assert.ok(first<115);
    }
    done();
};

require("sdk/test").run(exports);

