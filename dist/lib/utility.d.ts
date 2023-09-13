import type { Msg } from './types';
declare function srvmsgs(srv: Record<string, any>, model: Record<string, any>): Msg[];
declare function listmsgs(point?: Record<string, any>): Msg[];
declare const Utility: {
    srvmsgs: typeof srvmsgs;
    listmsgs: typeof listmsgs;
    deep: typeof import("@jsonic/jsonic-next/dist/utility").deep;
};
export { Utility };
