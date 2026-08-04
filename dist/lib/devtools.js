"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PREFIX = void 0;
exports.devtools = devtools;
exports.envFlag = envFlag;
// devtools: the development-only behaviour an environment entry switches
// on - Seneca's test mode, and the @seneca/repl dev REPL.
//
// These were hard-coded in the generated web entry: seneca.test() ran
// unconditionally, and the REPL was on unless a bare `REPL=false` said
// otherwise. Neither was visible in the model, so what a deployment
// actually enabled could not be read off it - and `REPL` is a name generic
// enough to collide with anything else in the environment.
//
// Now the model says what a deployment enables, and the env vars that
// override it are namespaced.
//
// @seneca/repl has no `active` option - its options shape is CLOSED, and
// passing one fails at load with "Plugin repl: option value is not valid".
// So enabling is a conditional `use`, not a plugin flag. If that changes
// upstream, this is the one place to simplify.
// Where the flags come from, most specific first:
//   1. <PREFIX>TEST / <PREFIX>REPL      - runtime override
//   2. main.env.<env>.dev.<flag>        - per-environment, from the model
//   3. main.conf.dev.<flag>             - project default, from the model
//   4. false                            - a deployment enables dev tooling
//                                         deliberately, never by accident
const DEFAULT_PREFIX = 'SENECA_';
exports.DEFAULT_PREFIX = DEFAULT_PREFIX;
// Parse an env var as a boolean. Absent or empty means "not set", so the
// next source down decides. Anything other than a recognised true/false
// word is an error rather than a silent false - `SENECA_REPL=yes` meaning
// "off" would be a miserable half hour.
function envFlag(name, raw) {
    if (null == raw || '' === raw) {
        return undefined;
    }
    const val = raw.trim().toLowerCase();
    if ('true' === val || '1' === val || 'yes' === val || 'on' === val) {
        return true;
    }
    if ('false' === val || '0' === val || 'no' === val || 'off' === val) {
        return false;
    }
    throw new Error('voxgig-system: ' + name + ' must be a boolean ' +
        '(true/false, 1/0, yes/no, on/off), got: ' + JSON.stringify(raw));
}
function envPrefix(model, spec) {
    if (null != spec.prefix) {
        if ('string' !== typeof spec.prefix) {
            throw new Error('voxgig-system: devtools `prefix` must be a string');
        }
        return spec.prefix;
    }
    const core = model && model.main && model.main.conf && model.main.conf.core;
    if (core && 'string' === typeof core.envprefix && '' !== core.envprefix) {
        return core.envprefix;
    }
    return DEFAULT_PREFIX;
}
// Resolve one dev flag through the four sources above.
function devFlag(model, spec, flag, env) {
    const name = envPrefix(model, spec) + flag.toUpperCase();
    const fromEnv = envFlag(name, env[name]);
    if (undefined !== fromEnv) {
        return fromEnv;
    }
    const main = (model && model.main) || {};
    const envdef = main.env && main.env[spec.env];
    if (envdef && envdef.dev && null != envdef.dev[flag]) {
        return !!envdef.dev[flag];
    }
    const conf = main.conf;
    if (conf && conf.dev && null != conf.dev[flag]) {
        return !!conf.dev[flag];
    }
    return false;
}
// The REPL port: <PREFIX>REPL_PORT, else the model's conf.port.repl.
function replPort(model, spec, env) {
    const name = envPrefix(model, spec) + 'REPL_PORT';
    const raw = env[name];
    if (null != raw && '' !== raw) {
        const port = parseInt(raw, 10);
        if (!Number.isInteger(port)) {
            throw new Error('voxgig-system: ' + name + ' must be an integer, got: ' +
                JSON.stringify(raw));
        }
        return port;
    }
    const port = model && model.main && model.main.conf &&
        model.main.conf.port && model.main.conf.port.repl;
    return 'number' === typeof port ? port : undefined;
}
// devtools(seneca, model, { env }): apply the dev-only behaviour this
// environment declares. Returns { test, repl, port } - what it decided -
// so an entry can log it or a test can assert on it.
//
// The REPL plugin is loaded only when enabled: it is the project's
// dependency, not this package's.
function devtools(seneca, model, spec) {
    if (null == spec || 'string' !== typeof spec.env || '' === spec.env) {
        throw new Error('voxgig-system: devtools requires a non-empty `env` string');
    }
    const procenv = 'undefined' === typeof process ? {} : (process.env || {});
    const test = devFlag(model, spec, 'test', procenv);
    const repl = devFlag(model, spec, 'repl', procenv);
    const port = repl ? replPort(model, spec, procenv) : undefined;
    if (test) {
        seneca.test();
    }
    if (repl) {
        seneca.use('repl', null == port ? {} : { port });
    }
    return { test, repl, port };
}
//# sourceMappingURL=devtools.js.map