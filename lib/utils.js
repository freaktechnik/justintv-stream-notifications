var { Cc } = require("chrome");

exports.exactArraySearch = function(array, string, rich) {
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};

exports.getFileContents = function(url) {
    var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    req.open('GET',url,false);
    req.send();
    return req.responseText;
}
            