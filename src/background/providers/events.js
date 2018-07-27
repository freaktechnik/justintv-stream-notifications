/**
 * Re-emits events from all providers.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import providers from './index.js';
import { pipe } from '../../utils.js';

const USER_EVENTS = [
        "updateduser",
        "newchannels"
    ],
    BASE_EVENTS = [ "updatedchannels" ];

class EventSink extends EventTarget {
    constructor() {
        super();

        for(const p in providers) {
            const provider = providers[p];
            for(const e of BASE_EVENTS) {
                pipe(provider, e, this);
            }

            if(provider.supports.favorites) {
                for(const e of USER_EVENTS) {
                    pipe(provider, e, this);
                }
            }
        }
    }
}

export default EventSink;
