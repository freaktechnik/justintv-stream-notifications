/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

/* global addon */
/* global filter */
/* global matches */
/* global show */
/* global hide */

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

var getChannelIdFromId = (id) => parseInt(id.substring(CHANNEL_ID_PREFIX.length), 10);

var contextMenuCommand = function(event) {
    addon.port.emit(event, getChannelIdFromId(currentMenuTarget.id));
    currentMenuTarget = null;
};

var resize = () => {
    var scrollHeight = document.querySelector(".tabbed").scrollHeight;
    var h = Math.ceil(Math.min(scrollHeight, addon.options.maxHeight));
    addon.port.emit("resize", [addon.options.panelWidth, h]);
};

var openChannel = (channelId) => {
    addon.port.emit("open", channelId);
};

var displayNoOnline = () => {
    show(document.getElementById("noonline"));
};

var hideNoOnline = () => {
    hide(document.getElementById("noonline"));
};

var hideNoChannels = () => {
    hide(document.getElementById("nochannels"));
};

var displayNoChannels = () => {
    displayNoOnline();
    show(document.getElementById("nochannels"));
};

var setStyle = (style) => {
    var newClass;
    switch(style) {
        case 2:
            newClass = "thumbnail";
            break;
        case 0:
            newClass = "compact";
            break;
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
};

var setExtrasVisibility = (visible) => {
    if(visible)
        live.classList.add("extras");
    else
        live.classList.remove("extras");
};

// Find the node to inser before in order to keep the list sorted
var findInsertionNodeIn = (list, name) => {
    var node = list.firstElementChild;

    while(node && name.localeCompare(node.querySelector(".name").textContent) >= 0) {
        node = node.nextSibling;
    }
    return node;
};

var insertChannel = (channel, node) => {
    if(channel.live)
        live.insertBefore(node, findInsertionNodeIn(live, channel.uname));
    else
        offline.insertBefore(node, findInsertionNodeIn(offline, channel.uname));

    resize();
};

var getBestImageForSize = (user, size) => {
    size = Math.round(parseInt(size, 10) * window.devicePixelRatio);
    // shortcut if there's an image with the size demanded
    if(user.image.hasOwnProperty(size.toString())) {
        return user.image[size];
    }

    // search next biggest image
    var index = Number.MAX_VALUE, biggest = 0;
    Object.keys(user.image).forEach((s) => {
        s = parseInt(s, 10);
        if(s > size && s < index)
            index = s;
        if(s > biggest)
            biggest = s;
    });

    if(index > biggest)
        index = biggest;

    return user.image[index];
};

var contextMenuListener = (e) => {
    currentMenuTarget = e.currentTarget;
    document.getElementById("contextOpen").disabled = e.currentTarget.parentNode.id == "offline";
};

var addChannel = (channel) => {
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
    if(!("viewers" in channel) || channel.viewers < 0)
        hide(viewersWrapper);
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
        hide(categoryWrapper);
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
    link.addEventListener("click", openChannel.bind(null, channel.id));
    channelNode.addEventListener("contextmenu", contextMenuListener);
    channelNode.classList.add(channel.type);
    channelNode.appendChild(link);
    channelNode.id = CHANNEL_ID_PREFIX+channel.id;

    // hide the channel by if it's filtered out atm
    if(!matches(channelNode, document.querySelector("#searchField").value, filters))
        hide(channelNode);

    insertChannel(channel, channelNode);
    hideNoChannels();
    if(channel.live)
        hideNoOnline();
};

var removeChannel = (channelId) => {
    var channelNode = document.getElementById(CHANNEL_ID_PREFIX+channelId);
    if("live" == channelNode.parentNode.id) {
        addon.port.emit("removedLive", channelId);
        // Smaller two, since we remove the channel node after this, as we still
        // needed its parent's id before.
        if(live.childElementCount < 2) {
            displayNoOnline();
        }
    }

    channelNode.remove();

    if(live.childElementCount === 0 && offline.childElementCount === 0) {
        displayNoChannels();
    }
    resize();
};

var updateNodeContent = (channel) => {
    var channelNode = document.getElementById(CHANNEL_ID_PREFIX+channel.id),
        nameNode = channelNode.querySelector(".name"),
        nameText = document.createTextNode(channel.uname),
        titleNode = channelNode.querySelector(".title"),
        titleText = document.createTextNode(channel.title),
        viewers = channelNode.querySelector(".viewers"),
        category = channelNode.querySelector(".category");

    titleNode.replaceChild(titleText, titleNode.firstChild);
    nameNode.replaceChild(nameText, nameNode.firstChild);

    viewers.replaceChild(document.createTextNode(channel.viewers), viewers.firstChild);
    if(!("viewers" in channel) || channel.viewers < 0)
        hide(channelNode.querySelector(".viewersWrapper"));
    else
        show(channelNode.querySelector(".viewersWrapper"));

    category.replaceChild(document.createTextNode(channel.category), category.firstChild);
    if(!channel.category)
        hide(channelNode.querySelector(".categoryWrapper"));
    else
        show(channelNode.querySelector(".categoryWrapper"));

    // only update images if the user is online to avoid broken images
    if(navigator.onLine) {
        channelNode.querySelector("a>img").setAttribute("src", channel.thumbnail+"?timestamp="+Date.now());
        channelNode.querySelector("a div img").setAttribute("src", getBestImageForSize(channel, 30));
    }
};

var makeChannelLive = (channel) => {
    hideNoOnline();
    updateNodeContent(channel);
    if(!live.querySelector("#"+CHANNEL_ID_PREFIX+channel.id))
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX+channel.id));
};

var makeChannelOffline = (channel) => {
    if(!offline.querySelector("#"+CHANNEL_ID_PREFIX+channel.id))
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX+channel.id));
    updateNodeContent(channel);
    if(live.childElementCount === 0) {
        displayNoOnline();
    }
};

// Set up DOM listeners and all that.
window.addEventListener("load", function() {
    live = document.getElementById("live");
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
    document.getElementById("contextRefresh").addEventListener("click", contextMenuCommand.bind(null, "refresh"));
    document.getElementById("contextOpen").addEventListener("click", contextMenuCommand.bind(null, "openArchive"));
    document.getElementById("contextChat").addEventListener("click", contextMenuCommand.bind(null, "openChat"));
    document.querySelector(".tabbed").addEventListener("tabchanged", resize);

    var field = document.querySelector("#searchField");
    document.querySelector("#searchButton").addEventListener("click", () => {
        if(field.hasAttribute("hidden")) {
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
    field.addEventListener("keyup", (e) => {
        filter(field.value, live, filters);
        filter(field.value, offline, filters);
        resize();
    });
 });

// Set up port commmunication listeners
addon.port.on("setStyle", setStyle);

addon.port.on("setExtras", setExtrasVisibility);

addon.port.on("addChannels", (channels) => {
    channels.forEach((channel) => {
        addChannel(channel);
    });
});

addon.port.on("removeChannel", removeChannel);

addon.port.on("setOnline", makeChannelLive);

addon.port.on("setOffline", makeChannelOffline);

addon.port.on("resize", resize);
