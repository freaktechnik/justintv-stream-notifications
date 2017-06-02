let clipboard;

export default (command) => {
    switch(command) {
        case "copy":
            clipboard = document.querySelector("textarea").value;
            return true;
            break;
        case "clipboard":
            return clipboard;
    }
};
