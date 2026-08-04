declare const DEFAULT_PREFIX = "SENECA_";
type DevtoolsSpec = {
    env: string;
    prefix?: string;
};
declare function envFlag(name: string, raw: string | undefined): boolean | undefined;
declare function devtools(seneca: any, model: any, spec: DevtoolsSpec): {
    test: boolean;
    repl: boolean;
    port?: number;
};
export type { DevtoolsSpec, };
export { devtools, envFlag, DEFAULT_PREFIX, };
