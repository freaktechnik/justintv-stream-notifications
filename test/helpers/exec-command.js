let clipboard = "";

export default (command) => {
    switch(command) {
    case "copy":
        clipboard = document.querySelector("textarea").value;
        return true;
    case "clipboard":
        return clipboard;
    case "clipboardObj":
        return Object.freeze({
            writeText(text) {
                clipboard = text;
                return Promise.resolve();
            },
            readText() {
                return Promise.resolve(clipboard);
            }
        });
    default:
        // nothing
    }
};
