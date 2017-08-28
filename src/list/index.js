    afterCopy = (success, details) => {
        if(success) {
            port.send("copied", details);
        }
    };

// Set up port commmunication listeners
port.addEventListener("message", async ({ detail: event }) => {
    switch(event.command) {
    // Queue autorefresh is enabled/disabled in the settings
    case "queueStatus": {
        const button = document.getElementById("refreshButton");
        if(event.payload) {
            button.setAttribute("contextmenu", "queue-context");
        }
        else {
            button.removeAttribute("contextmenu");
        }
        break;
    }
    default:
        // Nothing to do.
    }
});

// Set up DOM listeners and all that.
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("contextCopy").addEventListener("click", () => {
        const id = getChannelIdFromId(currentMenuTarget.id);
        port.request("copy", id)
            .then(copy)
            .then((s) => afterCopy(s, id));
        currentMenuTarget = null;
    }, false);
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
