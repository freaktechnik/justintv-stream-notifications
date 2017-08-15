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
            e.stopPropagation();
        }
        port.send("open", channelId);
        window.close();
    },
    openUrl = (url, e) => {
        if(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        port.send("openUrl", url);
        window.close();
    },
    contextMenuListener = (e) => {
        currentMenuTarget = e.currentTarget;
        const isOffline = e.currentTarget.parentNode.id == "offline";
        document.getElementById("contextOpen").disabled = isOffline;
        document.getElementById("contextRefresh").disabled = !state.getState().providers[e.currentTarget.className].enabled;
        document.getElementById("contextAdd").disabled = !state.getState().providers[e.currentTarget.className].enabled;
    },
    buildChannel = (channel, unspecific = false) => {

        if(!unspecific) {
            channelNode.id = CHANNEL_ID_PREFIX + channel.id;
            channelNode.querySelector("a").addEventListener("click", openChannel.bind(null, channel.id));
        }
        else {
            channelNode.id = EXPLORE_ID_PREFIX + channel.login;
            channelNode.classList.add("unspecific");
            channelNode.dataset.url = channel.url[0];
            channelNode.querySelector("a").addEventListener("click", openUrl.bind(null, channelIsLive(channel) ? channel.url[0] : channel.archiveUrl));
        }
        channelNode.addEventListener("contextmenu", contextMenuListener);

        if(channel.live.state > 0) {
            channelNode.classList.add("nonlive");
        }

        return channelNode;
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
                    providerDropdown.add(new Option(state.getState().providers[p].name, p));
                }
            });
            displayLoading();
        }
    },
    afterCopy = (success, details) => {
        if(success) {
            port.send("copied", details);
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
port.addEventListener("message", async ({ detail: event }) => {
    switch(event.command) {
    case "addChannels":
        for(const channelId of event.payload) {
            const channel = await list.getChannel(channelId);
            addChannel(channel);
        }
        break;
    case "removeChannel":
        removeChannel(event.payload);
        break;
    case "setOnline": {
        const channel = await list.getChannel(event.payload);
        makeChannelLive(channel);
        break;
    }
    case "setOffline": {
        const channel = await list.getChannel(event.payload);
        makeChannelOffline(channel);
        break;
    }
    case "setDistinct": {
        const channel = await list.getchannel(event.payload);
        makeChannelDistinct(channel);
        break;
    }
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
    default:
        // Nothing to do.
    }
});

// Set up DOM listeners and all that.
document.addEventListener("DOMContentLoaded", () => {
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
