import type { Msg } from './lib/types';
import { Utility } from './lib/utility';
import { MakeSrv } from './srv/make';
declare function messages(seneca: any, options: any, reload: any): void;
declare const System: {
    messages: typeof messages;
};
export type { Msg };
export { System, MakeSrv, Utility, };
