/* Copyright © 2026 Voxgig Ltd, MIT License. */

// seneca.context: the runtime facts every environment entry has to put on
// the Seneca instance before services load.
//
// This used to be five hand-written assignments at the top of every
// generated entry (local, docker, vm, aws, azure, cloudflare, web, and the
// test setups). Copy-paste let them drift: azure never set `stage` or
// `srvname`, cloudflare set none of them, and the web runner reported
// `env: 'local'` when it was the web environment. Nothing read those
// fields yet, so the drift was silent - which is exactly why it spread.
//
// One call now sets all five, and everything that CAN be derived is.


type ContextSpec = {
  env: string        // which entry this is - the only fact not in the model
  stage?: string     // deploy stage; see the resolution order below
  srvname?: string   // 'all' for a single process, the service for one-per-srv
}


// The service name for a process running every service in-tree. AWS Lambda
// is the one deployment that overrides it: one function per service.
const ALL_SRV = 'all'


// stage resolution, most specific first:
//   1. an explicit spec.stage      - the caller knows better (Lambda's STAGE)
//   2. process.env.STAGE           - deploy-time override
//   3. the model's env entry stage - main.env.<env>.stage, e.g. aws.stage
//   4. the env name                - a sensible last resort ('local', 'docker')
//
// (3) is the one that was being thrown away: a model could say
// `aws: { stage: 'dev' }` and every entry would still report 'aws'.
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


// context(seneca, model, pkg, { env }): set the runtime context an entry
// needs. Returns seneca so it can be chained.
//
// `env` is required and NOT derived: it is the one thing the model cannot
// tell us, because it names which entry is running. It need not be a model
// env name - 'lambda' and 'test' are entries without a matching main.env
// key - so it is deliberately not validated against the model.
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
