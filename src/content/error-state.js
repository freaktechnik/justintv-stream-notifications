import "./shared.css";

//TODO update error state gravity based on add/remove and not querying the storage.

class ErrorStateView {
    static get ERROR_STATE() {
        return browser.storage.local.get("errorStates")
            .then(({ errorStates }) => {
                if(errorStates.length) {
                    return errorStates.some((e) => e.gravity > 1) ? 2 : 1;
                }
                return 0;
            });
    }

    static getClassForGravity(gravity) {
        return gravity === 2 ? "unrecoverable" : "recoverable";
    }

    constructor(hook) {
        this.root = document.createElement("details");
        this.root.open = true;
        this.root.hidden = true;
        this.root.classList.add("esv");
        this.currentGravity = 0;

        this.title = document.createElement("summary");

        this.root.appendChild(this.title);

        this.list = document.createElement("ul");

        this.root.appendChild(this.list);

        browser.storage.local.get("errorStates").then(({ errorStates }) => {
            for(const es of errorStates) {
                this.addError(es);
            }
            hook.appendChild(this.root);
        });

        browser.storage.onChanged.addListener((change, areaName) => {
            if(areaName === "local" && "errorStates" in change.changes) {
                for(const e of change.changes.newValue) {
                    if(change.changes.oldValue.every(({ id }) => id !== e.id)) {
                        this.addError(e);
                    }
                }

                for(const e of change.changes.oldValue) {
                    if(change.changes.newValue.every(({ id }) => id !== e.id)) {
                        this.removeError(e);
                    }
                }
            }
        });

    }

    async updateTitle(gravity) {
        if(!gravity) {
            gravity = await ErrorStateView.ERROR_STATE;
        }

        if(gravity != this.currentGravity) {
            if(gravity === 0) {
                this.root.shidden = true;
            }
            else {
                this.root.hidden = false;
                this.title.textContent = browser.i18n.getMessage("errorState" + gravity);
                this.title.classList.add(ErrorStateView.getClassForGravity(gravity));
            }
            this.currentGravity = gravity;
        }
    }

    sendAction(id, action) {
        browser.runtime.sendMessage({
            command: 'errorState-action',
            id,
            action
        });
    }

    addError(errorState) {
        const root = document.createElement("li");
        root.classList.add(ErrorStateView.getClassForGravity(errorState.gravity));
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
                button.addEventListener("click", () => this.sendAction(errorState.id, actionId), {
                    passive: true,
                    capture: false
                });

                buttons.appendChild(button);
            }

            root.appendChild(buttons);
        }
        this.list.appendChild(root);

        this.updateTitle();
    }

    removeError(id) {
        const root = document.getElementById("es" + id);
        root.remove();
    }
}

export default (root) => {
    new ErrorStateView(root);
};
