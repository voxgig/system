"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_KINDS = void 0;
exports.resolveModelFolder = resolveModelFolder;
exports.resolveModelFiles = resolveModelFiles;
exports.addEntity = addEntity;
exports.addSrv = addSrv;
exports.addMsg = addMsg;
exports.addFields = addFields;
exports.addEnv = addEnv;
exports.fmt = fmt;
// Add elements (entity, srv, msg, field) to a Voxgig system project by
// appending jsonic blocks to the project's model source files. Appending
// works because aontu unifies repeated paths, and it preserves the user's
// existing formatting and comments.
//
// Each add* function takes either a String(name) - an empty element of
// that name is added - or a Jsonic(spec) - a jsonic definition of the
// element with config options.
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const jsonic_1 = require("@tabnas/jsonic");
// Values emitted bare (aontu type/token names); everything else is quoted.
const BARE_TOKENS = ['String', 'Number', 'Boolean', 'Skip'];
// Model sources use the .aontu extension; .jsonic is legacy.
const MODEL_EXTS = ['aontu', 'jsonic'];
// Locate the model folder from a starting folder: <start>/model,
// <start>/backend/model, or <start> itself if it holds model.aontu
// (or legacy model.jsonic).
function resolveModelFolder(start) {
    const candidates = [
        start,
        node_path_1.default.join(start, 'model'),
        node_path_1.default.join(start, 'backend', 'model'),
    ];
    for (const c of candidates) {
        for (const ext of MODEL_EXTS) {
            if (node_fs_1.default.existsSync(node_path_1.default.join(c, 'model.' + ext))) {
                return c;
            }
        }
    }
    throw new Error('model folder not found (looked for model.aontu in ' +
        candidates.join(', ') + ')');
}
// Resolve the entity/message/service source files from the @"file" refs
// in the root model file (main: ent: @"..."), falling back to
// conventional names.
function resolveModelFiles(start) {
    const folder = resolveModelFolder(start);
    let model = node_path_1.default.join(folder, 'model.' + MODEL_EXTS[0]);
    for (const ext of MODEL_EXTS) {
        const p = node_path_1.default.join(folder, 'model.' + ext);
        if (node_fs_1.default.existsSync(p)) {
            model = p;
            break;
        }
    }
    const src = node_fs_1.default.readFileSync(model, 'utf8');
    const ref = (key, base) => {
        const m = src.match(new RegExp('main:\\s*' + key + ':\\s*@"([^"]+)"'));
        if (m) {
            return node_path_1.default.join(folder, m[1]);
        }
        for (const ext of MODEL_EXTS) {
            const p = node_path_1.default.join(folder, base + '.' + ext);
            if (node_fs_1.default.existsSync(p)) {
                return p;
            }
        }
        return node_path_1.default.join(folder, base + '.' + MODEL_EXTS[0]);
    };
    return {
        folder,
        model,
        ent: ref('ent', 'ent'),
        msg: ref('msg', 'msg'),
        srv: ref('srv', 'srv'),
    };
}
// Format a value as jsonic source. Objects use multiline path-free style;
// known aontu tokens (String, Skip, ...) are emitted bare.
function fmt(val, depth) {
    const pad = '  '.repeat(depth);
    const padIn = '  '.repeat(depth + 1);
    if (null == val) {
        return 'null';
    }
    else if ('string' === typeof val) {
        return BARE_TOKENS.includes(val) ? val :
            "'" + val.replace(/'/g, "\\'") + "'";
    }
    else if ('object' !== typeof val) {
        return String(val);
    }
    else if (Array.isArray(val)) {
        return '[' + val.map((v) => fmt(v, depth + 1)).join(', ') + ']';
    }
    const entries = Object.entries(val);
    if (0 === entries.length) {
        return '{}';
    }
    return '{\n' +
        entries.map(([k, v]) => padIn + fmtKey(k) + ': ' + fmt(v, depth + 1))
            .join('\n') +
        '\n' + pad + '}';
}
function fmtKey(k) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k :
        "'" + k.replace(/'/g, "\\'") + "'";
}
function append(file, text) {
    const existing = node_fs_1.default.readFileSync(file, 'utf8');
    const sep = existing.endsWith('\n') ? '\n' : '\n\n';
    node_fs_1.default.appendFileSync(file, sep + text + '\n');
    return { file, text };
}
// Parse a name-or-spec argument. Returns { name, def } where def is the
// element definition object ({} for the plain-name form).
function parseArg(arg, kind) {
    let parsed;
    try {
        parsed = (0, jsonic_1.Jsonic)(arg);
    }
    catch (e) {
        throw new Error('invalid ' + kind + ' argument (jsonic parse failed): ' +
            arg + ' - ' + e.message);
    }
    if ('string' === typeof parsed) {
        return { name: parsed, def: {} };
    }
    if (null != parsed && 'object' === typeof parsed && !Array.isArray(parsed)) {
        // { name: 'foo', ...def }
        if ('string' === typeof parsed.name) {
            const def = { ...parsed };
            delete def.name;
            return { name: parsed.name, def };
        }
        // { foo: {...def} } - single-key form
        const keys = Object.keys(parsed);
        if (1 === keys.length && 'object' === typeof parsed[keys[0]]) {
            return { name: keys[0], def: parsed[keys[0]] };
        }
    }
    throw new Error('invalid ' + kind + ' argument: ' + arg +
        ' - provide a name, {name:...,...spec}, or {thename:{...spec}}');
}
// The last compiled model (model.json next to the model source), used to
// make the add operations idempotent: an element that already exists in
// the compiled model is skipped rather than appended again. Formatting
// of the sources is irrelevant since the check is semantic. Returns null
// when the model has not been compiled yet (adds then simply append -
// aontu unification of an identical element converges anyway).
function compiledModel(files) {
    const p = node_path_1.default.join(files.folder, 'model.json');
    try {
        return JSON.parse(node_fs_1.default.readFileSync(p, 'utf8'));
    }
    catch (e) {
        return null;
    }
}
// Default zone for entities: the single non-sys zone shape spread already
// in the entity file (`<zone>: &: ...`), else 'app'.
function defaultZone(entFile) {
    const src = node_fs_1.default.readFileSync(entFile, 'utf8');
    const zones = [...src.matchAll(/^([a-z][a-z0-9_]*):\s*&:/mg)]
        .map((m) => m[1])
        .filter((z) => 'sys' !== z);
    const uniq = [...new Set(zones)];
    return 1 === uniq.length ? uniq[0] : 'app';
}
// add entity [String(name)|Jsonic(spec)]
// Names may be zone-qualified: app/thing. Spec: { name, zone?, ...def }.
function addEntity(start, arg) {
    var _a, _b, _c;
    const files = resolveModelFiles(start);
    const { name: rawname, def } = parseArg(arg, 'entity');
    let zone = def.zone;
    delete def.zone;
    let name = rawname;
    if (rawname.includes('/')) {
        const parts = rawname.split('/');
        zone = parts[0];
        name = parts[1];
    }
    zone = zone || defaultZone(files.ent);
    // Idempotent: entity already in the compiled model.
    const model = compiledModel(files);
    if ((_c = (_b = (_a = model === null || model === void 0 ? void 0 : model.main) === null || _a === void 0 ? void 0 : _a.ent) === null || _b === void 0 ? void 0 : _b[zone]) === null || _c === void 0 ? void 0 : _c[name]) {
        return { file: files.ent, text: '', skipped: true };
    }
    if (null == def.field) {
        def.field = {};
    }
    if (null == def.valid) {
        def.valid = { '$$': 'Open' };
    }
    const src = node_fs_1.default.readFileSync(files.ent, 'utf8');
    const shapeLine = new RegExp('^' + zone + ':\\s*&:', 'm').test(src) ? '' :
        zone + ': &: $.main.shape.ent\n\n';
    const text = '\n' + shapeLine +
        zone + ': ' + name + ': ' + fmt(def, 0);
    return append(files.ent, text);
}
// add srv [String(name)|Jsonic(spec)]
// The plain-name form wires the service to its aim messages and a private
// web area (matching the standard project scaffold).
function addSrv(start, arg) {
    var _a, _b;
    const files = resolveModelFiles(start);
    const { name, def } = parseArg(arg, 'srv');
    // Idempotent: service already in the compiled model.
    const model = compiledModel(files);
    if ((_b = (_a = model === null || model === void 0 ? void 0 : model.main) === null || _a === void 0 ? void 0 : _a.srv) === null || _b === void 0 ? void 0 : _b[name]) {
        return { file: files.srv, text: '', skipped: true };
    }
    if (null == def.in) {
        def.in = {
            aim: { [name]: {} },
        };
    }
    if (null == def.user) {
        def.user = { required: true };
    }
    if (null == def.api) {
        def.api = { web: { path: { area: 'private/', suffix: '' } } };
    }
    if (null == def.env) {
        def.env = { lambda: { active: true } };
    }
    const text = '\n' + name + ': ' + fmt(def, 0);
    return append(files.srv, text);
}
// add msg [String(name)|Jsonic(spec)]
// Name form: a message path like thing.save.item (or thing:save:item);
// 'aim' is prepended if missing. Spec: { name: 'thing.save.item', ...meta }
// where meta (params, transport, file, ...) lands under the '$' key.
function addMsg(start, arg) {
    var _a;
    const files = resolveModelFiles(start);
    // A pure message path (thing.save.item, aim:thing:save:item) is taken
    // as-is - jsonic would otherwise parse the colon form as a nested map.
    const pathform = /^[a-z0-9_-]+([.:/][a-z0-9_-]+)+$/i.test(arg.trim());
    let parsed;
    try {
        parsed = pathform ? arg.trim() : (0, jsonic_1.Jsonic)(arg);
    }
    catch (e) {
        throw new Error('invalid msg argument (jsonic parse failed): ' +
            arg + ' - ' + e.message);
    }
    let path;
    let meta = {};
    if ('string' === typeof parsed) {
        path = parsed.split(/[.:/]/).filter((p) => '' !== p);
    }
    else if (null != parsed && 'string' === typeof parsed.name) {
        path = parsed.name.split(/[.:/]/).filter((p) => '' !== p);
        meta = { ...parsed };
        delete meta.name;
    }
    else {
        throw new Error('invalid msg argument: ' + arg +
            " - provide a message path like thing.save.item, or {name:'path',...meta}");
    }
    if ('aim' !== path[0]) {
        path.unshift('aim');
    }
    if (path.length < 2) {
        throw new Error('invalid msg path: ' + path.join('.'));
    }
    // Idempotent: message path already in the compiled model.
    const model = compiledModel(files);
    if (null != model) {
        let node = (_a = model.main) === null || _a === void 0 ? void 0 : _a.msg;
        for (const p of path) {
            node = node === null || node === void 0 ? void 0 : node[p];
        }
        if (null != node) {
            return { file: files.msg, text: '', skipped: true };
        }
    }
    const prefix = path.join(': ');
    const text = 0 === Object.keys(meta).length ?
        '\n' + prefix + ': {}' :
        '\n' + prefix + ": '$': " + fmt(meta, 0);
    return append(files.msg, text);
}
// add field <entity> [String(name)|Jsonic(spec)] ...
// Field forms: title | title:String | title:{kind:String,valid:'Min(1)'}
//            | {name:title,kind:String}
// A label is derived from the name when not given.
function addFields(start, entref, fieldargs) {
    var _a, _b, _c, _d, _e;
    const files = resolveModelFiles(start);
    let zone;
    let name;
    if (entref.includes('/')) {
        [zone, name] = entref.split('/');
    }
    else {
        zone = defaultZone(files.ent);
        name = entref;
    }
    if (0 === fieldargs.length) {
        throw new Error('no fields given');
    }
    const model = compiledModel(files);
    const out = [];
    for (const arg of fieldargs) {
        let parsed;
        try {
            parsed = (0, jsonic_1.Jsonic)(arg);
        }
        catch (e) {
            throw new Error('invalid field argument (jsonic parse failed): ' +
                arg + ' - ' + e.message);
        }
        let fname;
        let def;
        if ('string' === typeof parsed) {
            fname = parsed;
            def = {};
        }
        else if (null != parsed && 'object' === typeof parsed) {
            if ('string' === typeof parsed.name) {
                fname = parsed.name;
                def = { ...parsed };
                delete def.name;
            }
            else {
                const keys = Object.keys(parsed);
                if (1 !== keys.length) {
                    throw new Error('invalid field argument: ' + arg);
                }
                fname = keys[0];
                const val = parsed[fname];
                def = 'string' === typeof val ? { kind: val } : { ...val };
            }
        }
        else {
            throw new Error('invalid field argument: ' + arg);
        }
        // Idempotent: field already on the entity in the compiled model.
        if ((_e = (_d = (_c = (_b = (_a = model === null || model === void 0 ? void 0 : model.main) === null || _a === void 0 ? void 0 : _a.ent) === null || _b === void 0 ? void 0 : _b[zone]) === null || _c === void 0 ? void 0 : _c[name]) === null || _d === void 0 ? void 0 : _d.field) === null || _e === void 0 ? void 0 : _e[fname]) {
            out.push({ file: files.ent, text: '', skipped: true });
            continue;
        }
        if (null == def.kind) {
            def.kind = 'String';
        }
        if (null == def.label) {
            def.label = fname
                .split('_')
                .map((p) => '' === p ? p : p[0].toUpperCase() + p.substring(1))
                .join(' ');
        }
        // Emit label before kind, matching scaffold convention.
        const ordered = { label: def.label, kind: def.kind };
        for (const k of Object.keys(def)) {
            if ('label' !== k && 'kind' !== k) {
                ordered[k] = def[k];
            }
        }
        const text = '\n' + zone + ': ' + name + ': field: ' + fname + ': ' +
            fmt(ordered, 0);
        out.push(append(files.ent, text));
    }
    return out;
}
// The environment kinds @voxgig/build's EnvGen supports (kind defaults
// to the env name; an unknown kind fails generation with this list too).
const ENV_KINDS = ['local', 'basic', 'docker', 'vm', 'aws', 'azure', 'cloudflare'];
exports.ENV_KINDS = ENV_KINDS;
// add env [String(name)|Jsonic(spec)]
// Declares a target environment in the model (main: env: <name>: {...}).
// Name form: `add env aws`. Spec form: `add env
// '{name:aws2,kind:aws,region:eu-west-1,stage:prd}'`. Appends to the
// model file referenced as `main: env: @"..."` when present, else to the
// root model file.
function addEnv(start, arg) {
    var _a, _b;
    const files = resolveModelFiles(start);
    const { name, def } = parseArg(arg, 'env');
    const kind = def.kind || name;
    if (!ENV_KINDS.includes(kind)) {
        throw new Error('unknown environment kind: ' + kind +
            ' (known: ' + ENV_KINDS.join(', ') +
            '; use {name:..., kind:...} for a custom-named env)');
    }
    // Idempotent: environment already in the compiled model.
    const model = compiledModel(files);
    if ((_b = (_a = model === null || model === void 0 ? void 0 : model.main) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b[name]) {
        return { file: files.model, text: '', skipped: true };
    }
    if (null == def.active) {
        def.active = true;
    }
    // Target: the env model file when referenced, else the root model file.
    const src = node_fs_1.default.readFileSync(files.model, 'utf8');
    const m = src.match(/main:\s*env:\s*@"([^"]+)"/);
    const target = m ? node_path_1.default.join(files.folder, m[1]) : files.model;
    const prefix = m ? '' : 'main: env: ';
    const text = '\n' + prefix + name + ': ' + fmt(def, 0);
    return append(target, text);
}
//# sourceMappingURL=add.js.map