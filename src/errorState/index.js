import '../content/shared.css';
import './errorState.css';

const list = document.getElementById("errors"),
    sendAction = (errorStateId, actionId) => {
        browser.runtime.sendMessage({
            command: 'errorState-action',
            id: errorStateId,
            action: actionId
        });
        window.close();
    },
    getClassForGravity = (gravity) => {
        return gravity === 1 ? "recoverable" : "unrecoverable";
    },
    addErrorState = (errorState) => {
        const root = document.createElement("li");
        root.classList.add(getClassForGravity(errorState.gravity));
        root.id = "es" + errorState.id;

        const message = document.createElement("p");
        message.textContent = errorState.message;

        root.appendChild(message);

        if(errorState.actions.length) {
            const buttons = document.createElement("div");
            buttons.classList.add("buttons");

            for(const actionId in errorState.actions) {
                const action = errorState.actions[actionId];
                const button = document.createElement("button");
                button.textContent = action;
                button.value = action;
                button.addEventListener("click", sendAction.bind(null, errorState.id, actionId), {
                    passive: true,
                    capture: false
                });

                buttons.appendChild(button);
            }

            root.appendChild(buttons);
        }
        list.appendChild(root);
    },
    removeErrorState = (errorState) => {
        const root = document.getElementById("es" + errorState.id);
        root.remove();
    };

browser.storage.local.get("errorStates").then(({ errorStates }) => {
    errorStates.forEach(addErrorState);
});

browser.storage.onChanged.addListener((change) => {
    if(change.areaName === "local" && "errorStates" in change.changes) {
        for(const e of change.changes.newValue) {
            if(change.changes.oldValue.every(({ id }) => id !== e.id)) {
                addErrorState(e);
            }
        }

        for(const e of change.changes.oldValue) {
            if(change.changes.newValue.every(({ id }) => id !== e.id)) {
                removeErrorState(e);
            }
        }
    }
});
