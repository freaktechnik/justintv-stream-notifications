/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

"use strict";
 
exports.channelInfo = function() {
    return {
        // name of the channel
        'login':'',
        // name of the channel
        'name':'',
        // Title of the last stream
        'title':'',
        // live status
        'live':false,
        // url to the main page
        'url':'',
        // avatar displayed in the panel (url)
        'panelAvatar':'',
        // avatar displayed in the notification (url)
        'notificationAvatar':'',
        // background color of the channel page
        'backgroundColor':'',
        // text color of the channel page
        'textColor':'',
        // link color of the channel page
        'linkColor':'',
        // null if inexistent else url to image
        'bgImage':null,
        // stream thumbnail, updated frequently
        'thumbnail':null,
        'full':false
    };
};
