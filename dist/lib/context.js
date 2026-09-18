"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SRV = void 0;
exports.context = context;
exports.resolveStage = resolveStage;
// The service name for a process running every service in-tree. AWS Lambda
// is the one deployment that overrides it: one function per service.
const ALL_SRV = 'all';
exports.ALL_SRV = ALL_SRV;
function resolveStage(model, spec) {
    if (null != spec.stage && '' !== spec.stage) {
        return spec.stage;
    }
    const fromEnvVar = 'undefined' === typeof process ? undefined :
        process.env && process.env.STAGE;
    if (null != fromEnvVar && '' !== fromEnvVar) {
        return fromEnvVar;
    }
    const envdef = model && model.main && model.main.env &&
        model.main.env[spec.env];
    if (envdef && null != envdef.stage && '' !== envdef.stage) {
        return envdef.stage;
    }
    return spec.env;
}
function context(seneca, model, pkg, spec) {
    if (null == spec || 'string' !== typeof spec.env || '' === spec.env) {
        throw new Error('voxgig-system: context requires a non-empty `env` string');
    }
    seneca.context.model = model;
    seneca.context.pkg = pkg;
    seneca.context.env = spec.env;
    seneca.context.stage = resolveStage(model, spec);
    seneca.context.srvname = spec.srvname || ALL_SRV;
    return seneca;
}
//# sourceMappingURL=context.js.map