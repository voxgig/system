type ContextSpec = {
    env: string;
    stage?: string;
    srvname?: string;
};
declare const ALL_SRV = "all";
declare function resolveStage(model: any, spec: ContextSpec): string;
declare function context(seneca: any, model: any, pkg: any, spec: ContextSpec): any;
export type { ContextSpec, };
export { context, resolveStage, ALL_SRV, };
