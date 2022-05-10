import type { Msg } from './lib/types';
import { Utility } from './lib/utility';
import { MakeSrv } from './srv/make';
declare function messages(seneca: any, options: any, reload: any): void;
declare function prepare(seneca: any, require: any): void;
declare function Local(this: any, options: any): void;
declare const System: {
    messages: typeof messages;
    prepare: typeof prepare;
};
export type { Msg };
export { System, MakeSrv, Utility, Local, };
