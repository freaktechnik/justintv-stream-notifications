/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

var tabs = require("sdk/tabs");

exports.selectOrOpenTab = function selectOrOpenTab(channel) {
    let hasTab = false;
    for(let ti in tabs) {
        //TODO make this compare to the archive URL?
        if(channel.compareUrl(tabs[ti].url)) {
            tabs[ti].activate();
            hasTab = true;
            break;
        }
    }
    if(!hasTab)
        tabs.open({url: channel.archiveUrl});
};

