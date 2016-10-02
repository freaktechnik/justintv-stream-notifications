/**
 * Build query strings from an Object
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

export default {
    stringify(obj) {
        const qs = new URLSearchParams();
        for(let q in obj) {
            qs.append(q, obj[q]);
        }

        return qs.toString();
    }
};
