/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

var tabs = require("sdk/tabs");

exports.selectOrOpenTab = function selectOrOpenTab(channel, what) {
    let toCheck = [];

    if(what === "chat")
        toCheck.push(channel.chatUrl);
    else if(what === "archive" || !channel.live)
        toCheck.push(channel.archiveUrl);
    else
        toCheck = channel.url;

    for(let ti in tabs) {
        //TODO make this compare to the archive URL?
        if(toCheck.some((url) => url === tabs[ti].url)) {
            tabs[ti].activate();
            return;
        }
    }
    // There's no tab open for the channel
    tabs.open({url: toCheck[0]});
};
