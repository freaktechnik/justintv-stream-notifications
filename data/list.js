/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

var live, offline, currentMenuTarget, currentStyle;
const CHANNEL_ID_PREFIX = "channel";
const CONTEXTMENU_ID    = "context";
const filters = [
    {
        attribute: "class"
    },
    {
        subtarget: ".name"
    },
    {
        subtarget: ".title"
    },
    {
        subtarget: ".viewers"
    },
    {
        subtarget: ".category"
    }
];

window.addEventListener("load", function() {
    live    = document.getElementById("live");
    offline = document.getElementById("offline");
    setStyle(addon.options.style);
    setExtrasVisibility(addon.options.extras);
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
    document.getElementById("contextChat").addEventListener("click", function() {
        addon.port.emit("openChat", parseInt(currentMenuTarget.id.substring(CHANNEL_ID_PREFIX.length), 10));
    });
    document.querySelector(".tabbed").addEventListener("tabchanged", function() {
        resize();
    });
    
    var field = document.querySelector("#searchField");
    document.querySelector("#searchButton").addEventListener("click", function() {
        if(field.classList.contains("hidden")) {
            show(field);
            field.focus();
        }
        else {
            hide(field);
            field.value = "";
            filter(field.value, live, filters);
            filter(field.value, offline, filters);
        }
        resize();
    });
    field.addEventListener("keydown", function(e) {
        filter(field.value, live, filters);
        filter(field.value, offline, filters);
        resize();
    });
 });

// Set up port commmunication listeners
addon.port.on("setStyle", function(style) {
    setStyle(style);
});

addon.port.on("setExtras", function(visible) {
    setExtrasVisibility(visible);
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
 
addon.port.on("resize", resize);

function resize() {
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

function setExtrasVisibility(visible) {
    if(visible)
        live.classList.add("extras");
    else
        live.classList.remove("extras");
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
    size = Math.round(parseInt(size, 10) * window.devicePixelRatio);
    // shortcut if there's an image with the size demanded
    if(user.image.hasOwnProperty(size.toString())) {
        return user.image[size];
    }
    
    // search next biggest image
    var index = Number.MAX_VALUE, biggest = 0;
    Object.keys(user.image).forEach(function(s) {
        s = parseInt(s, 10);
        if(s > size && s < index)
            index = s;
        if(s > biggest)
            biggest = s;
    });

    if(index > biggest)
        index = biggest;
    
    return user.image[index];
}

function addChannel(channel) {
    /*
     <li class="type" id="channel1">
        <a href="" contextmenu="context">
            <img src="thumbnail">
            <div>
                <img src="avatar">
                <span class="name">ChannelName</span><br>
                <span class="title">ChannelTitle</span>
                <aside>
                    <span class="viewersWrapper">
                        <span class="icon">v</span>&nbsp;<span class="viewers">0</span>
                    </span>&nbsp;
                    <span class="categoryWrapper">
                        <span class="icon">c</span>&nbsp;<span class="category">Category</span>
                    </span>
                </aside>
            </div>
        </a>
    </li>
     */
    var channelNode   = document.createElement("li"),
        link          = document.createElement("a"),
        name          = document.createTextNode(channel.uname),
        spanName      = document.createElement("span"),
        br            = document.createElement("br"),
        title         = document.createTextNode(channel.title),
        titleSpan     = document.createElement("span"),
        avatar        = new Image(),
        thumbnail     = new Image(),
        wrapper       = document.createElement("div"),
        extra         = document.createElement("aside"),
        viewersWrapper = document.createElement("span"),
        viewersIcon   = document.createElement("span"),
        viewers       = document.createElement("span"),
        categoryWrapper = document.createElement("span"),
        categoryIcon  = document.createElement("span"),
        category      = document.createElement("span");
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

    viewersWrapper.classList.add("viewersWrapper");
    if(!channel.viewers && channel.viewers != 0)
        viewersWrapper.classList.add("hidden");
    viewersIcon.appendChild(document.createTextNode("v"));
    viewersIcon.classList.add("icon");
    viewersWrapper.appendChild(viewersIcon);
    viewersWrapper.appendChild(document.createTextNode("\u00a0")); // &nbsp;
    viewers.classList.add("viewers");
    viewers.appendChild(document.createTextNode(channel.viewers));
    viewersWrapper.appendChild(viewers);
    extra.appendChild(viewersWrapper);
    extra.appendChild(document.createTextNode(" "));
    categoryWrapper.classList.add("categoryWrapper");
    if(!channel.category)
        categoryWrapper.classList.add("hidden");
    categoryIcon.appendChild(document.createTextNode("c"));
    categoryIcon.classList.add("icon");
    categoryWrapper.appendChild(categoryIcon);
    categoryWrapper.appendChild(document.createTextNode("\u00a0"));
    category.classList.add("category");
    category.appendChild(document.createTextNode(channel.category));
    categoryWrapper.appendChild(category);
    extra.appendChild(categoryWrapper);

    wrapper.appendChild(extra);

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
    
    // hide the channel by if it's filtered out atm
    console.log(document.querySelector("#searchField").value);
    if(!matches(channelNode, document.querySelector("#searchField").value, filters))
        hide(channelNode);
    
    insertChannel(channel, channelNode);
    hideNoChannels();
    if(channel.live)
        hideNoOnline();
}

function removeChannel(channelId) {
    var channelNode = document.getElementById(CHANNEL_ID_PREFIX+channelId);
    if("live" == channelNode.parentNode.id && live.childElementCount < 2) {
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
        titleText = document.createTextNode(channel.title),
        viewers = channelNode.querySelector(".viewers"),
        category = channelNode.querySelector(".category");
    titleNode.replaceChild(titleText, titleNode.firstChild);
    
    viewers.replaceChild(document.createTextNode(channel.viewers), viewers.firstChild);
    if(!channel.viewers && channel.viewers != 0)
        channelNode.querySelector(".viewersWrapper").classList.add("hidden");
    else
        channelNode.querySelector(".viewersWrapper").classList.remove("hidden");
    category.replaceChild(document.createTextNode(channel.category), category.firstChild);
    if(!channel.category)
        channelNode.querySelector(".categoryWrapper").classList.add("hidden");
    else
        channelNode.querySelector(".categoryWrapper").classList.remove("hidden");

    channelNode.querySelector("a>img").setAttribute("src", channel.thumbnail+"?timestamp="+Date.now());
    channelNode.querySelector("a div img").setAttribute("src", getBestImageForSize(channel, 30));
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
