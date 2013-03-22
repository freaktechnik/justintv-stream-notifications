/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

"use strict";
 
var { Cc } = require("chrome");

// searches in an array for a value
exports.exactArraySearch = function(array, string, rich) {
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};


// loads the file from url and returns its contents
exports.getFileContents = function(url) {
    var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    req.open('GET',url,false);
    req.send();
    return req.responseText;
}
            