/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

/* global addon */
/* global filter */
/* global matches */
/* global show */
/* global hide */

var live, offline, explore, currentMenuTarget, currentStyle;
const CHANNEL_ID_PREFIX = "channel";
const EXPLORE_ID_PREFIX = "explorechan";
const CONTEXTMENU_ID    = "context";
const EXPLORE_CONTEXTMENU_ID = "explore-context";
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

var toggle = (node, condition) => {
    if(condition)
        show(node);
    else
        hide(node);
};

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

var openUrl = (url) => {
    addon.port.emit("openUrl", url);
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

var displayLoading = () => {
    show(document.getElementById("loadingexplore"));
    explore.parentNode.classList.add("loading");
};

var hideLoading = () => {
    hide(document.getElementById("loadingexplore"));
    explore.parentNode.classList.remove("loading");
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
        var main = document.querySelector(".tabbed");
        main.classList.add(newClass);
        main.classList.remove(currentStyle);
        currentStyle = newClass;
    }
    resize();
};

var setExtrasVisibility = (visible) => {
    document.querySelector(".tabbed").classList.toggle("extras", visible);
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

var buildChannel = (channel, unspecific = false) => {
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
        channelNode.classList.add(channel.type);
        channelNode.appendChild(link);
        if(!unspecific) {
            channelNode.id = CHANNEL_ID_PREFIX+channel.id;
            link.setAttribute("contextmenu", CONTEXTMENU_ID);
            link.addEventListener("click", openChannel.bind(null, channel.id));
        }
        else {
            channelNode.id = EXPLORE_ID_PREFIX+channel.login;
            link.setAttribute("contextmenu", EXPLORE_CONTEXTMENU_ID);
            link.addEventListener("click", openUrl.bind(null, channel.url[0]));
        }
        channelNode.addEventListener("contextmenu", contextMenuListener);

        return channelNode;
};

var addChannel = (channel) => {
    var channelNode = buildChannel(channel);
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

    if(live.childElementCount === 0 && offline.childElementCount === 0)
        displayNoChannels();

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
    toggle(channelNode.querySelector(".viewersWrapper"), ("viewers" in channel) && channel.viewers > 0);

    category.replaceChild(document.createTextNode(channel.category), category.firstChild);
    toggle(channelNode.querySelector(".categoryWrapper"), !!channel.category);

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
    if(live.childElementCount === 0)
        displayNoOnline();
};

var getFeaturedChannels = (type) => {
    displayLoading();
    addon.port.emit("explore", type);
};

var providerSearch = (type, query) => {
    displayLoading();
    addon.port.emit("search", type, query);
};

var externalContextMenuAdd = (e) => {
    addon.port.emit("add", currentMenuTarget.className, currentMenuTarget.id.substring(EXPLORE_ID_PREFIX.length));
    currentMenuTarget = null;
};

var forwardEvent = (name, event) => {
    event.preventDefault();
    addon.port.emit(name);
};

var applySearchToExplore = (exploreSelect, field) => {
    if(field.hasAttribute("hidden") || field.value == "")
        getFeaturedChannels(exploreSelect.value);
    else
        providerSearch(exploreSelect.value, field.value);
};

var hasOption = (provider) => {
    var providerDropdown = document.getElementById("exploreprovider");
    for(var o of providerDropdown.options) {
        if(o.value == provider) {
            return true;
        }
    }
    return false;
};

// Set up port commmunication listeners
addon.port.on("setStyle", setStyle);
addon.port.on("setExtras", setExtrasVisibility);
addon.port.on("addChannels", (channels) => channels.forEach(addChannel));
addon.port.on("removeChannel", removeChannel);
addon.port.on("setOnline", makeChannelLive);
addon.port.on("setOffline", makeChannelOffline);
addon.port.on("resize", resize);

addon.port.on("addExploreProviders", (providers) => {
    var providerDropdown = document.getElementById("exploreprovider");
    for(var provider of providers) {
        if(!hasOption(provider.type)) {
            providerDropdown.add(new Option(provider.name, provider.type));
        }
    }
    displayLoading();
});

addon.port.on("setFeatured", (channels, type, q) => {
    var field = document.getElementById("searchField");
    if(type !== document.getElementById("exploreprovider").value ||
       (q !== null &&
        !field.hasAttribute("hidden") &&
        field.value != q)
    )
        return;

    while(explore.hasChildNodes())
        explore.firstChild.remove();

    if(channels.length === 0) {
        show(document.getElementById("noresults"));
    }
    else {
        hide(document.getElementById("noresults"));
        channels.forEach((channel) => {
            explore.appendChild(buildChannel(channel, true));
        });
    }

    hideLoading();
    resize();
});

// Set up DOM listeners and all that.
window.addEventListener("load", function() {
    live = document.getElementById("live");
    offline = document.getElementById("offline");
    explore = document.getElementById("featured");
    var exploreSelect = document.getElementById("exploreprovider");
    var field = document.querySelector("#searchField");

    setStyle(addon.options.style);
    setExtrasVisibility(addon.options.extras);
    resize();

    document.getElementById("configure").addEventListener("click", forwardEvent.bind(null, "configure"));
    document.getElementById("refreshButton").addEventListener("click", function(e) {
        forwardEvent("refresh", e);
        if(!explore.parentNode.hasAttribute("hidden"))
            getFeaturedChannels(exploreSelect.value);
    });
    document.getElementById("contextRefresh").addEventListener("click", contextMenuCommand.bind(null, "refresh"));
    document.getElementById("contextOpen").addEventListener("click", contextMenuCommand.bind(null, "openArchive"));
    document.getElementById("contextChat").addEventListener("click", contextMenuCommand.bind(null, "openChat"));
    document.getElementById("contextAdd").addEventListener("click", externalContextMenuAdd);
    document.querySelector(".tabbed").addEventListener("tabchanged", (e) => {
        if(e.detail === 3)
            applySearchToExplore(exploreSelect, field);

        resize();
    });
    exploreSelect.addEventListener("change", () => {
        applySearchToExplore(exploreSelect, field);
    });
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

            if(!explore.parentNode.hasAttribute("hidden"))
                applySearchToExplore(exploreSelect, field);
        }
        resize();
    });
    field.addEventListener("keyup", (e) => {
        filter(field.value, live, filters);
        filter(field.value, offline, filters);
        if(!explore.parentNode.hasAttribute("hidden"))
            applySearchToExplore(exploreSelect, field);
        else
            resize();
    });

    addon.port.emit("ready");
});
