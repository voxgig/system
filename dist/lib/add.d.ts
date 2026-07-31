export type ModelFiles = {
    folder: string;
    model: string;
    ent: string;
    msg: string;
    srv: string;
};
export type AddResult = {
    file: string;
    text: string;
    skipped?: boolean;
};
declare function resolveModelFolder(start: string): string;
declare function resolveModelFiles(start: string): ModelFiles;
declare function fmt(val: any, depth: number): string;
declare function addEntity(start: string, arg: string): AddResult;
declare function addSrv(start: string, arg: string): AddResult;
declare function addMsg(start: string, arg: string): AddResult;
declare function addFields(start: string, entref: string, fieldargs: string[]): AddResult[];
export { resolveModelFolder, resolveModelFiles, addEntity, addSrv, addMsg, addFields, fmt, };
