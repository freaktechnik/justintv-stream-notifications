    contextMenuCommand = (event) => {
        port.send(event, getChannelIdFromId(currentMenuTarget.id));
        if(event == "openArchive" || event == "openChat") {
            window.close();
        }
        currentMenuTarget = null;
    },
    contextMenuListener = (e) => {
        currentMenuTarget = e.currentTarget;
        const isOffline = e.currentTarget.parentNode.id == "offline";
        document.getElementById("contextOpen").disabled = isOffline;
        document.getElementById("contextRefresh").disabled = !state.getState().providers[e.currentTarget.className].enabled;
        document.getElementById("contextAdd").disabled = !state.getState().providers[e.currentTarget.className].enabled;
    },
    externalContextMenuCommand = (command) => {
        port.send(command, {
            type: currentMenuTarget.className,
            login: currentMenuTarget.id.substring(EXPLORE_ID_PREFIX.length)
        });
        currentMenuTarget = null;
    },
    afterCopy = (success, details) => {
        if(success) {
            port.send("copied", details);
        }
    };

// Set up port commmunication listeners
port.addEventListener("message", async ({ detail: event }) => {
    switch(event.command) {
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
});
