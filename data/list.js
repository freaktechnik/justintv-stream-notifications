/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

var live, offline, currentMenuTarget, currentStyle;
const CHANNEL_ID_PREFIX = "channel";
const CONTEXTMENU_ID    = "context";

 window.addEventListener("load", function() {
    live    = document.getElementById("live");
    offline = document.getElementById("offline");
    setStyle(addon.options.style);
    resize();
    document.getElementById("configure").addEventListener("click", function(e) {
        e.preventDefault();
        addon.port.emit("configure");
    });
    document.getElementById("refreshButton").addEventListener("click", function(e) {
        e.preventDefault();
        addon.port.emit("refresh");
    });
    document.getElementById("contextRefresh").addEventListener("click", function() {
        addon.port.emit("refresh", parseInt(currentMenuTarget.id.substring(CHANNEL_ID_PREFIX.length), 10));
        currentMenuTarget = null;
    });
    document.getElementById("contextOpen").addEventListener("click", function() {
        addon.port.emit("openArchive", parseInt(currentMenuTarget.id.substring(CHANNEL_ID_PREFIX.length), 10));
        currentMenuTarget = null;
    });
    document.querySelector(".tabbed").addEventListener("tabchanged", function() {
        resize();
    });
 });

// Set up port commmunication listeners
addon.port.on("setStyle", function(style) {
    setStyle(style);
});

addon.port.on("addChannels", function(channels) {
    channels.forEach(function(channel) {
        addChannel(channel);
    });
});

addon.port.on("removeChannel", function(channelId) {
    removeChannel(channelId);
});

addon.port.on("setOnline", function(channel) {
    makeChannelLive(channel);
});

addon.port.on("setOffline", function(channel) {
    makeChannelOffline(channel);
});
 
function resize() {
    //TODO fixaroo
    var h = document.querySelector(".tabbed").scrollHeight < addon.options.maxHeight ? document.querySelector(".tabbed").scrollHeight : addon.options.maxHeight;
    addon.port.emit("resize", [addon.options.panelWidth, h]);
}

function open(channelId) {
    addon.port.emit("open", channelId);
}

function setStyle(style) {
    var newClass;
    switch(style) {
        case 2:
            newClass = "thumbnail";
            break;
        case 0:
            newClass = "compact";
            break;
        case 1:
        default:
            newClass = "default";
    }
    if(newClass != currentStyle) {
        live.classList.add(newClass);
        live.classList.remove(currentStyle);
        offline.classList.add(newClass);
        offline.classList.remove(currentStyle);
        currentStyle = newClass;
    }
    resize();
}

// Find the node to inser before in order to keep the list sorted
function findInsertionNodeIn(list, name) {
    var node = list.firstElementChild;

    while(node && name.localeCompare(node.querySelector(".name").textContent) >= 0) {
        node = node.nextSibling;
    }
    return node;
}

function insertChannel(channel, node) {
    if(channel.live)
        live.insertBefore(node, findInsertionNodeIn(live, channel.uname));
    else
        offline.insertBefore(node, findInsertionNodeIn(offline, channel.uname));
    
    resize();
}

function getBestImageForSize(user, size) {
    // shortcut if there's an image with the size demanded
    if(user.image.hasOwnProperty(size.toString())) {
        return user.image[size];
    }
    
    // search next biggest image
    var index = Number.MAX_VALUE;
    Object.keys(user.image).forEach(function(s) {
        s = parseInt(s, 10);
        if(s > size && s < index) {
            index = s;
        }
    });
    return user.image[index];
}

function addChannel(channel) {
    var channelNode   = document.createElement("li"),
        link          = document.createElement("a"),
        name          = document.createTextNode(channel.uname),
        spanName      = document.createElement("span"),
        br            = document.createElement("br"),
        title         = document.createTextNode(channel.title),
        titleSpan     = document.createElement("span"),
        avatar        = new Image(),
        thumbnail     = new Image(),
        wrapper       = document.createElement("div");
    avatar.src        = getBestImageForSize(channel, 30);
    thumbnail.src     = channel.thumbnail;
    spanName.appendChild(name);
    spanName.classList.add("name");
    titleSpan.appendChild(title);
    titleSpan.classList.add("title");
    wrapper.appendChild(avatar);
    wrapper.appendChild(spanName);
    wrapper.appendChild(br);
    wrapper.appendChild(titleSpan);
    link.appendChild(thumbnail);
    link.appendChild(wrapper);
    link.setAttribute("contextmenu", CONTEXTMENU_ID);
    link.addEventListener("click", open.bind(null, channel.id));
    channelNode.addEventListener("contextmenu", function(e) {
        currentMenuTarget = e.currentTarget;
        document.getElementById("contextOpen").disabled = e.currentTarget.parentNode.id == "offline";
    });
    channelNode.classList.add(channel.type);
    channelNode.appendChild(link);
    channelNode.id = CHANNEL_ID_PREFIX+channel.id;
    insertChannel(channel, channelNode);
    hideNoChannels();
}

function removeChannel(channelId) {
    var channelNode = document.getElementById(CHANNEL_ID_PREFIX+channelId);
    if(channelNode.parentNode.id = "live" && live.childElementCount < 2) {
        displayNoOnline();
        addon.port.emit("offline");
    }
    channelNode.remove();
    if(live.childElementCount == 0 && offline.childElementCount == 0) {
        displayNoChannels();
    }
    resize();
}

function updateNodeContent(channel) {
    var channelNode = document.getElementById(CHANNEL_ID_PREFIX+channel.id),
        titleNode = channelNode.querySelector(".title"),
        titleText = document.createTextNode(channel.title);
    titleNode.replaceChild(titleText, titleNode.firstChild);
    channelNode.querySelector("a>img").src = channel.thumbnail;
}

function makeChannelLive(channel) {
    hideNoOnline();
    updateNodeContent(channel);
    if(!live.querySelector("#"+CHANNEL_ID_PREFIX+channel.id))
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX+channel.id));
}

function makeChannelOffline(channel) {
    insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX+channel.id));
    if(live.childElementCount == 0) {
        addon.port.emit("offline");
        displayNoOnline();
    }
}

function displayNoOnline() {
    show(document.getElementById("noonline"));
}

function hideNoOnline() {
    hide(document.getElementById("noonline"));
}

function hideNoChannels() {
    hide(document.getElementById("nochannels"));
}

function displayNoChannels() {
    displayNoOnline();
    show(document.getElementById("nochannels"));
}
