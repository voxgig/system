import type { Msg } from './lib/types';
import { Utility } from './lib/utility';
import { MakeSrv } from './srv/make';
import { addEntity, addSrv, addMsg, addFields, addEnv, resolveModelFiles } from './lib/add';
import { listTemplates, ejectFragment, ejectCode, diffTemplates } from './lib/template';
declare function messages(seneca: any, options: any, reload: any): void;
declare function gubuify(params: any, Gubu: any): any;
declare function prepare(seneca: any, require: any): void;
declare function Local(this: any, options: any): void;
type LiveOptions = {
    srv: {
        name: string;
        folder: string;
    };
    options: Record<string, any>;
};
declare function Live(this: any, options: LiveOptions): void;
declare const System: {
    messages: typeof messages;
    prepare: typeof prepare;
};
export type { Msg };
declare const Add: {
    entity: typeof addEntity;
    srv: typeof addSrv;
    msg: typeof addMsg;
    fields: typeof addFields;
    env: typeof addEnv;
    resolveModelFiles: typeof resolveModelFiles;
};
declare const Template: {
    list: typeof listTemplates;
    eject: typeof ejectFragment;
    ejectCode: typeof ejectCode;
    diff: typeof diffTemplates;
};
export { Add, Template, gubuify, System, MakeSrv, Utility, Local, Live, };
