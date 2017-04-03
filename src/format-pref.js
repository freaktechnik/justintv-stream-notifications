export const format = (value, type) => {
    if((type == "string" || type == "radio") && typeof value != "string") {
        return value.toString();
    }
    else if(type == "bool" && typeof value != "boolean") {
        return !!value;
    }
    else if(type == "integer") {
        if(typeof value != "number") {
            return Number.parseInt(value, 10);
        }
        else if(!Number.isInteger(value) && Number.isFinite(value)) {
            return Math.round(value);
        }
        else if(Number.isInteger(value) && value < 0) {
            return 0;
        }
    }
    return value;
};
