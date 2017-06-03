let clipboard;

export default (command) => {
    switch(command) {
    case "copy":
        clipboard = document.querySelector("textarea").value;
        return true;
    case "clipboard":
        return clipboard;
    default:
        // nothing
    }
};
