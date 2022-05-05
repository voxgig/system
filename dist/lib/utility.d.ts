import type { Msg } from './types';
declare function listmsgs(point?: Record<string, any>): Msg[];
declare const Utility: {
    listmsgs: typeof listmsgs;
};
export { Utility };
