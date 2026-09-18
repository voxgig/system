/* Copyright © 2026 Voxgig Ltd, MIT License. */



type ContextSpec = {
  env: string        // which entry this is - the only fact not in the model
  stage?: string     // deploy stage; see the resolution order below
  srvname?: string   // 'all' for a single process, the service for one-per-srv
}


// The service name for a process running every service in-tree. AWS Lambda
// is the one deployment that overrides it: one function per service.
const ALL_SRV = 'all'


function resolveStage(model: any, spec: ContextSpec): string {
  if (null != spec.stage && '' !== spec.stage) {
    return spec.stage
  }

  const fromEnvVar = 'undefined' === typeof process ? undefined :
    process.env && process.env.STAGE
  if (null != fromEnvVar && '' !== fromEnvVar) {
    return fromEnvVar
  }

  const envdef = model && model.main && model.main.env &&
    model.main.env[spec.env]
  if (envdef && null != envdef.stage && '' !== envdef.stage) {
    return envdef.stage
  }

  return spec.env
}


function context(seneca: any, model: any, pkg: any, spec: ContextSpec): any {
  if (null == spec || 'string' !== typeof spec.env || '' === spec.env) {
    throw new Error('voxgig-system: context requires a non-empty `env` string')
  }

  seneca.context.model = model
  seneca.context.pkg = pkg
  seneca.context.env = spec.env
  seneca.context.stage = resolveStage(model, spec)
  seneca.context.srvname = spec.srvname || ALL_SRV

  return seneca
}


export type {
  ContextSpec,
}

export {
  context,
  resolveStage,
  ALL_SRV,
}
