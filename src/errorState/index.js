import ErrorStateConsts from '../error-state.json';
import '../content/shared.css';
import './errorState.css';

// TODO share code with the global error state info bar.

const list = document.getElementById("errors"),
    sendAction = (errorStateId, actionId) => {
        browser.runtime.sendMessage({
            command: 'errorState-action',
            id: errorStateId,
            action: actionId
        });
        window.close();
    },
    getClassForGravity = (gravity) => gravity === ErrorStateConsts.RECOVERABLE ? "recoverable" : "unrecoverable",
    addErrorState = (errorState) => {
        const root = document.createElement("li"),
            message = document.createElement("p");
        root.classList.add(getClassForGravity(errorState.gravity));
        root.id = `es${errorState.id}`;
        message.textContent = errorState.message;

        root.appendChild(message);

        if(errorState.actions.length) {
            const buttons = document.createElement("div");
            buttons.classList.add("buttons");

            for(const actionId in errorState.actions) {
                const action = errorState.actions[actionId],
                    button = document.createElement("button");
                button.textContent = action;
                button.value = action;
                button.classList.add("browser-style");
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
        const root = document.getElementById(`es${errorState.id}`);
        root.remove();
    };

browser.storage.local.get(ErrorStateConsts.STORE)
    .then(({ [ErrorStateConsts.STORE]: values }) => {
        values.forEach(addErrorState);
    })
    .catch(console.error);

browser.storage.onChanged.addListener((changes, areaName) => {
    if(areaName === "local" && ErrorStateConsts.STORE in changes) {
        const errorStateChanges = changes[ErrorStateConsts.STORE];
        for(const e of errorStateChanges.newValue) {
            if(!errorStateChanges.oldValue.length || errorStateChanges.oldValue.every(({ id }) => id !== e.id)) {
                addErrorState(e);
            }
        }

        if(Array.isArray(errorStateChanges.oldValue)) {
            for(const e of errorStateChanges.oldValue) {
                if(!errorStateChanges.newValue.length || errorStateChanges.newValue.every(({ id }) => id !== e.id)) {
                    removeErrorState(e);
                }
            }
        }
    }
});
