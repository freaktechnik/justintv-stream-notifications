/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

var tabs = require("sdk/tabs");

exports.selectOrOpenTab = function selectOrOpenTab(channel, forceArchive) {
    let hasTab = false,
        url    = channel.live && !forceArchive ? channel.url[0] : channel.archiveUrl;
    for(let ti in tabs) {
        //TODO make this compare to the archive URL?
        if(tabs[ti].url == url || (!forceArchive && channel.compareUrl(tabs[ti].url))) {
            tabs[ti].activate();
            hasTab = true;
            break;
        }
    }
    if(!hasTab)
        tabs.open({url: url});
};
