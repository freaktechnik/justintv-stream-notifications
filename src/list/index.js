/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Ctrl+F should toggle filter
 */
import { hide, show, toggle, copy } from '../content/utils';
import { filter, matches } from '../content/filter';
import Tabbed from '../content/tabbed';
import '../content/l10n';
import './list.css';
import '../content/shared.css';
import 'open-iconic/sprite/open-iconic.min.svg';
import LiveState from '../live-state.json';
import Port from '../port';
import ReadChannelList from '../read-channel-list';

let live,
    secondaryLive,
    offline,
    distinct,
    explore,
    currentMenuTarget,
    currentStyle = "default",
    providers,
    nonLiveDisplay,
    tabbed;
const port = new Port("list", true),
    CHANNEL_ID_PREFIX = "channel",
    EXPLORE_ID_PREFIX = "explorechan",
    CONTEXTMENU_ID = "context",
    EXPLORE_CONTEXTMENU_ID = "explore-context",
    filters = [
        {
            subtarget: ".provider"
        },
        {
            subtarget: ".name"
        },
        {
            subtarget: ".alternate-name"
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
    ],
    channelIsLive = (channel) => channel.live.state == LiveState.LIVE || (nonLiveDisplay < 3 && channel.live.state > LiveState.LIVE),
    getChannelIdFromId = (id) => parseInt(id.substring(CHANNEL_ID_PREFIX.length), 10),
    contextMenuCommand = (event) => {
        port.send(event, getChannelIdFromId(currentMenuTarget.id));
        if(event == "openArchive" || event == "openChat") {
            window.close();
        }
        currentMenuTarget = null;
    },
    openChannel = (channelId, e) => {
        if(e) {
            e.preventDefault();
        }
        port.send("open", channelId);
        window.close();
    },
    openUrl = (url, e) => {
        if(e) {
            e.preventDefault();
        }
        port.send("openUrl", url);
        window.close();
    },
    displayNoOnline = () => {
        show(document.getElementById("noonline"));
    },
    hideNoOnline = () => {
        hide(document.getElementById("noonline"));
    },
    hideNoChannels = () => {
        hide(document.getElementById("nochannels"));
    },
    displayNoChannels = () => {
        displayNoOnline();
        show(document.getElementById("nochannels"));
    },
    displayLoading = () => {
        show(document.getElementById("loadingexplore"));
        explore.parentNode.classList.add("loading");
    },
    hideLoading = () => {
        hide(document.getElementById("loadingexplore"));
        explore.parentNode.classList.remove("loading");
    },
    setStyle = (style) => {
        let newClass;
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
            if(currentStyle) {
                tabbed.classList.replace(currentStyle, newClass);
            }
            else {
                tabbed.classList.add(newClass);
            }
            currentStyle = newClass;
        }
    },
    setExtrasVisibility = (visible) => {
        tabbed.classList.toggle("extras", visible);
    },
    findInsertionNodeIn = (list, name) => {
        // Find the node to insert before in order to keep the list sorted
        let node = list.firstElementChild;

        while(node && name.localeCompare(node.querySelector(".name").textContent) >= 0) {
            node = node.nextSibling;
        }
        return node;
    },
    insertBefore = (parent, node, uname) => {
        if(!parent.querySelector("#" + node.id)) {
            parent.insertBefore(node, findInsertionNodeIn(parent, uname));
        }
    },
    insertChannel = (channel, node) => {
        const isNonLive = channel.live.state >= LiveState.REDIRECT;
        if(channel.live.state == LiveState.LIVE || (nonLiveDisplay === 0 && isNonLive)) {
            insertBefore(live, node, channel.uname);
        }
        else if(isNonLive && nonLiveDisplay == 1) {
            insertBefore(secondaryLive, node, channel.uname);
        }
        else if(isNonLive && nonLiveDisplay == 2) {
            insertBefore(distinct, node, channel.uname);
        }
        else {
            insertBefore(offline, node, channel.uname);
        }
    },
    contextMenuListener = (e) => {
        currentMenuTarget = e.currentTarget;
        const isOffline = e.currentTarget.parentNode.id == "offline";
        document.getElementById("contextOpen").disabled = isOffline;
        document.getElementById("contextRefresh").disabled = !providers[e.currentTarget.className].enabled;
        document.getElementById("contextAdd").disabled = !providers[e.currentTarget.className].enabled;
    },
    buildChannel = (channel, unspecific = false) => {
        const channelNode = document.createElement("li");
        channelNode.insertAdjacentHTML("beforeend",
            `<a href="" contextmenu="${unspecific ? EXPLORE_CONTEXTMENU_ID : CONTEXTMENU_ID}">
    <img src="">
    <div>
        <img srcset="" sizes="30px">
        <span class="rebroadcast hide-offline" hidden><svg class="icon" viewBox="0 0 8 8">
            <use xlink:href="../../assets/images/open-iconic.min.svg#loop"></use>
        </svg> </span><span class="name"></span><span class="nonlivename hide-offline" hidden> → <span class="alternate-name"></span></span><br>
        <span class="title hide-offline"></span>
        <aside>
            <span class="viewersWrapper hide-offline">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../../assets/images/open-iconic.min.svg#eye"></use>
                </svg>&nbsp;<span class="viewers">0</span>&#x20;
            </span>
            <span class="categoryWrapper hide-offline">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../../assets/images/open-iconic.min.svg#tag"></use>
                </svg>&nbsp;<span class="category"></span>&#x20;
            </span>
            <span class="providerWrapper">
                <svg class="icon" viewBox="0 0 8 8">
                    <use xlink:href="../../assets/images/open-iconic.min.svg#hard-drive"></use>
                </svg>&nbsp;<span class="provider"></span>
            </span>
        </aside>
    </div>
</a>`);
        channelNode.querySelector("div img").srcset = Object.keys(channel.image).map((s) => `${channel.image[s]} ${s}w`).join(",");
        channelNode.querySelector("div img").sizes = "30px";
        channelNode.querySelector("a > img").setAttribute("src", channel.thumbnail);
        channelNode.querySelector(".name").textContent = channel.uname;
        channelNode.querySelector(".title").textContent = channel.title;
        channelNode.querySelector(".alternate-name").textContent = channel.live.alternateUsername;
        toggle(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
        toggle(channelNode.querySelector(".rebroadcast"), channel.live.state == LiveState.REBROADCAST);
        if(!("viewers" in channel) || channel.viewers < 0) {
            hide(channelNode.querySelector(".viewersWrapper"));
        }
        channelNode.querySelector(".viewers").textContent = channel.viewers;
        if(!channel.category) {
            hide(channelNode.querySelector(".categoryWrapper"));
        }
        channelNode.querySelector(".category").textContent = channel.category;
        channelNode.querySelector(".provider").textContent = providers[channel.type].name;
        channelNode.classList.add(channel.type);
        if(!unspecific) {
            channelNode.id = CHANNEL_ID_PREFIX + channel.id;
            channelNode.querySelector("a").addEventListener("click", openChannel.bind(null, channel.id));
        }
        else {
            channelNode.id = EXPLORE_ID_PREFIX + channel.login;
            channelNode.dataset.url = channel.url[0];
            channelNode.querySelector("a").addEventListener("click", openUrl.bind(null, channelIsLive(channel) ? channel.url[0] : channel.archiveUrl));
        }
        channelNode.addEventListener("contextmenu", contextMenuListener);

        if(channel.live.state > 0) {
            channelNode.classList.add("nonlive");
        }

        return channelNode;
    },
    countLiveChannels = () => live.childElementCount + secondaryLive.childElementCount,
    addChannel = (channel) => {
        const channelNode = buildChannel(channel);
        // hide the channel by if it's filtered out atm
        if(!matches(channelNode, document.querySelector("#searchField").value, filters)) {
            hide(channelNode);
        }

        insertChannel(channel, channelNode);
        hideNoChannels();
        if(channelIsLive(channel)) {
            hideNoOnline();
        }
    },
    removeChannel = (channelId) => {
        const channelNode = document.getElementById(CHANNEL_ID_PREFIX + channelId);
        if(channelNode.parentNode.id === "live") {
            port.send("removedLive", channelId);
            // Smaller two, since we remove the channel node after this, as we still
            // needed its parent's id before.
            if(countLiveChannels() < 2) {
                displayNoOnline();
            }
        }

        channelNode.remove();

        if(countLiveChannels() === 0 && offline.childElementCount === 0 && distinct.childElementCount === 0) {
            displayNoChannels();
        }
    },
    updateNodeContent = (channel) => {
        const channelNode = document.getElementById(CHANNEL_ID_PREFIX + channel.id),
            nameNode = channelNode.querySelector(".name"),
            titleNode = channelNode.querySelector(".title"),
            viewers = channelNode.querySelector(".viewers"),
            category = channelNode.querySelector(".category");

        titleNode.textContent = channel.title;
        nameNode.textContent = channel.uname;
        channelNode.querySelector(".alternate-name").textContent = channel.live.alternateUsername;
        toggle(channelNode.querySelector(".nonlivename"), channel.live.alternateUsername !== "");
        toggle(channelNode.querySelector(".rebroadcast"), channel.live.state == LiveState.REBROADCAST);

        viewers.textContent = channel.viewers;
        toggle(channelNode.querySelector(".viewersWrapper"), ("viewers" in channel) && channel.viewers > 0);

        category.textContent = channel.category;
        toggle(channelNode.querySelector(".categoryWrapper"), !!channel.category);

        channelNode.classList.toggle("nonlive", channel.live.state > LiveState.LIVE);

        // only update images if the user is online to avoid broken images
        if(navigator.onLine) {
            if(channelIsLive(channel)) {
                channelNode.querySelector("a>img").setAttribute("src", channel.thumbnail + "?timestamp=" + Date.now());
            }

            channelNode.querySelector("a div img").srcset = Object.keys(channel.image)
                .map((s) => channel.image[s] + " " + s + "w").join(",");
        }
    },
    //TODO placing stuff (live channel goes hosted -> might need reordering)
    makeChannelLive = (channel) => {
        hideNoOnline();
        updateNodeContent(channel);
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
    },
    makeChannelOffline = (channel) => {
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
        updateNodeContent(channel);
        if(countLiveChannels() === 0) {
            displayNoOnline();
        }
    },
    makeChannelDistinct = (channel) => {
        insertChannel(channel, document.getElementById(CHANNEL_ID_PREFIX + channel.id));
        updateNodeContent(channel);
        if(countLiveChannels() === 0) {
            displayNoOnline();
        }
    },
    getFeaturedChannels = (type) => {
        displayLoading();
        port.send("explore", type);
    },
    providerSearch = (type, query) => {
        displayLoading();
        port.send("search", {
            type,
            query
        });
    },
    externalContextMenuCommand = (command) => {
        port.send(command, {
            type: currentMenuTarget.className,
            login: currentMenuTarget.id.substring(EXPLORE_ID_PREFIX.length)
        });
        currentMenuTarget = null;
    },
    forwardEvent = (name, event) => {
        if(event) {
            event.preventDefault();
        }
        port.send(name);
        if(name == "configure") {
            window.close();
        }
    },
    applySearchToExplore = (exploreSelect, field) => {
        if(field.hasAttribute("hidden") || field.value === "") {
            getFeaturedChannels(exploreSelect.value);
        }
        else {
            providerSearch(exploreSelect.value, field.value);
        }
    },
    hasOption = (provider) => {
        const providerDropdown = document.getElementById("exploreprovider");
        for(const o of providerDropdown.options) {
            if(o.value == provider) {
                return true;
            }
        }
        return false;
    },
    addExploreProviders = (exploreProviders) => {
        if(exploreProviders.length > 0) {
            show(document.getElementById("exploreTab"));
            const providerDropdown = document.getElementById("exploreprovider");
            exploreProviders.forEach((p) => {
                if(!hasOption(p)) {
                    providerDropdown.add(new Option(providers[p].name, p));
                }
            });
            displayLoading();
        }
    },
    toggleQueueContextItems = (queuePaused) => {
        toggle(document.getElementById("pauseAutorefresh"), !queuePaused);
        toggle(document.getElementById("resumeAutorefresh"), queuePaused);
    },
    setNonLiveDisplay = (display) => {
        const nonLiveTab = document.getElementById("nonliveTab"),
            channelsToMove = Array.from(document.querySelectorAll(".nonlive"));

        toggle(nonLiveTab, display == 2);
        toggle(secondaryLive, display == 1);

        if(nonLiveDisplay == 2 && display != 2 && tabbed._tabbed.current == 4) {
            tabbed._tabbed.select(1);
        }

        nonLiveDisplay = display;

        // Reposition all existing non-live channels
        let parent = live;
        if(display == 1) {
            parent = secondaryLive;
        }
        else if(display == 2) {
            parent = distinct;
        }
        else if(display == 3) {
            parent = offline;
        }

        if(channelsToMove.length && display <= 1) {
            hideNoOnline();
        }

        for(const node of channelsToMove) {
            insertBefore(parent, node, node.querySelector(".name").textContent);
        }

        if(countLiveChannels() === 0 && display >= 2) {
            displayNoOnline();
        }
    },
    setTheme = (theme) => {
        document.body.classList.toggle("dark", theme === 1);
    },
    afterCopy = (success, details) => {
        if(success) {
            port.send("copied", details);
        }
    },
    toggleSearch = () => {
        const button = document.getElementById("searchButton"),
            field = document.getElementById("searchField");
        if(field.hasAttribute("hidden")) {
            show(field);
            field.focus();
            button.setAttribute("aria-pressed", "true");
        }
        else {
            hide(field);
            field.value = "";
            filter(field.value, live, filters);
            filter(field.value, offline, filters);
            filter(field.value, secondaryLive, filters);
            button.setAttribute("aria-pressed", "false");
            field.blur();

            if(!explore.parentNode.hasAttribute("hidden")) {
                const exploreSelect = document.getElementById("exploreprovider");
                applySearchToExplore(exploreSelect, field);
            }
        }
    },
    refresh = (e) => {
        forwardEvent("refresh", e);
        if(!explore.parentNode.hasAttribute("hidden")) {
            const exploreSelect = document.getElementById("exploreprovider");
            getFeaturedChannels(exploreSelect.value);
        }
    };

// Set up port commmunication listeners
port.addEventListener("message", ({ detail: event }) => {
    switch(event.command) {
    case "setStyle":
        setStyle(event.payload);
        break;
    case "setExtras":
        setExtrasVisibility(event.payload);
        break;
    case "addChannels":
        event.payload.forEach(addChannel);
        break;
    case "removeChannel":
        removeChannel(event.payload);
        break;
    case "setOnline":
        makeChannelLive(event.payload);
        break;
    case "setOffline":
        makeChannelOffline(event.payload);
        break;
    case "setDistinct":
        makeChannelDistinct(event.payload);
        break;
    case "setNonLiveDisplay":
        setNonLiveDisplay(event.payload);
        break;
    case "queuePaused":
        toggleQueueContextItems(event.payload);
        document.getElementById("refreshButton").classList.toggle("running", !event.payload);
        break;
    // Queue autorefresh is enabled/disabled in the settings
    case "queueStatus": {
        const button = document.getElementById("refreshButton");
        if(event.payload) {
            button.setAttribute("contextmenu", "queue-context");
        }
        else {
            button.removeAttribute("contextmenu");
        }

        button.classList.toggle("running", event.payload);
        break;
    }
    case "setProviders":
        providers = event.payload;
        addExploreProviders(
            Object.keys(providers)
                .filter((p) => providers[p].supports.featured)
        );
        break;
    case "setFeatured": {
        const { channels, type, q } = event.payload;
        if(type !== document.getElementById("exploreprovider").value ||
           (q !== null &&
            document.getElementById("searchField").value != q)
        ) {
            return;
        }

        while(explore.hasChildNodes()) {
            explore.firstChild.remove();
        }

        if(channels.length === 0) {
            show(document.getElementById("noresults"));
        }
        else {
            hide(document.getElementById("noresults"));
            explore.append.apply(explore, channels.map((channel) => {
                return buildChannel(channel, true);
            }));
        }

        hideLoading();
        break;
    }
    case "theme":
        setTheme(event.payload);
        break;
    default:
        // Nothing to do.
    }
});

// Set up DOM listeners and all that.
document.addEventListener("DOMContentLoaded", () => {
    live = document.getElementById("live");
    offline = document.getElementById("offline");
    distinct = document.getElementById("nonlive");
    explore = document.getElementById("featured");
    secondaryLive = document.getElementById("secondarylive");
    const exploreSelect = document.getElementById("exploreprovider"),
        field = document.getElementById("searchField"),
        list = new ReadChannelList();

    list.addEventListener("ready", () => {
        list.getChannelsByType().then((channels) => {
            channels.forEach(addChannel);
        });
    }, {
        once: true
    });

    document.getElementById("configure").addEventListener("click", forwardEvent.bind(null, "configure"));
    document.getElementById("refreshButton").addEventListener("click", refresh);
    document.getElementById("contextRefresh").addEventListener("click", contextMenuCommand.bind(null, "refresh"), false);
    document.getElementById("contextOpen").addEventListener("click", contextMenuCommand.bind(null, "openArchive"), false);
    document.getElementById("contextChat").addEventListener("click", contextMenuCommand.bind(null, "openChat"), false);
    document.getElementById("contextCopy").addEventListener("click", () => {
        const id = getChannelIdFromId(currentMenuTarget.id);
        port.request("copy", id)
            .then(copy)
            .then((s) => afterCopy(s, id));
        currentMenuTarget = null;
    }, false);
    document.getElementById("contextAdd").addEventListener("click", externalContextMenuCommand.bind(null, "add"), false);
    document.getElementById("contextExploreCopy").addEventListener("click", () => {
        const type = currentMenuTarget.className,
            login = currentMenuTarget.id.substring(EXPLORE_ID_PREFIX.length);
        port.request("copyexternal", {
            type,
            login
        })
            .then(copy)
            .then((s) => afterCopy(s, [ login, type ]));
        currentMenuTarget = null;
    }, false);
    document.getElementById("pauseAutorefresh").addEventListener("click", () => forwardEvent("pause"), false);
    document.getElementById("resumeAutorefresh").addEventListener("click", () => forwardEvent("resume"), false);
    tabbed = document.querySelector(".tabbed");
    tabbed._tabbed = new Tabbed(tabbed);
    tabbed.addEventListener("tabchanged", (e) => {
        if(e.detail === 3) {
            applySearchToExplore(exploreSelect, field);
        }
    }, false);
    exploreSelect.addEventListener("change", () => {
        applySearchToExplore(exploreSelect, field);
    }, false);
    document.querySelector("#searchButton").addEventListener("click", (e) => {
        e.preventDefault();
        toggleSearch();
    }, false);
    field.addEventListener("input", () => {
        filter(field.value, live, filters);
        filter(field.value, offline, filters);
        filter(field.value, secondaryLive, filters);
        if(!explore.parentNode.hasAttribute("hidden")) {
            applySearchToExplore(exploreSelect, field);
        }
    }, false);

    document.addEventListener("keypress", (e) => {
        if(!e.altKey && !e.shiftKey && !e.metaKey) {
            if(e.ctrlKey) {
                switch(e.key) {
                case 'F':
                    e.preventDefault();
                    toggleSearch();
                    break;
                case 'R':
                    refresh(e);
                    break;
                case 'C':
                    //TODO get currently hovered channel and dispatch copy command for it.
                    break;
                default:
                }
            }
            else if(e.code == "F5") {
                refresh(e);
            }
        }
    }, {
        capture: true,
        passive: false
    });

    forwardEvent("ready");
});
