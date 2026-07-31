"use strict";
/* Copyright © 2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENERATORS = void 0;
exports.resolveProject = resolveProject;
exports.listTemplates = listTemplates;
exports.ejectFragment = ejectFragment;
exports.ejectCode = ejectCode;
exports.diffTemplates = diffTemplates;
// Template customization tooling: list / eject / diff for the generation
// templates provided by @voxgig/build.
//
// Layered resolution (first hit wins):
//   1. backend/src/gen/<name>.ts   compiled generator override (deep custom)
//   2. backend/tm/lambda/<frag>    project fragment (text-level custom)
//   3. @voxgig/build               package defaults
//
// eject copies a package fragment (or, with code=true, a template source
// rewired to the package's public API) into the project, recording
// provenance in tm/lambda/.ejected.json so diff can show upstream drift
// after package upgrades.
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const add_1 = require("./add");
// The code-level template generators (env/lambda/<name>.ts in the package).
const GENERATORS = ['srv_yml', 'srv_handler', 'res_yml'];
exports.GENERATORS = GENERATORS;
// Generator shorthand -> default fragment.
const GENERATOR_FRAG = {
    srv_yml: 'srv.yml.frag',
    srv_handler: 'srv_handler.ts.frag',
    res_yml: 'res.role.yml.frag',
};
function resolveProject(start) {
    const files = (0, add_1.resolveModelFiles)(start);
    const backend = node_path_1.default.dirname(files.folder);
    let pkgjson;
    try {
        pkgjson = require.resolve('@voxgig/build/package.json', {
            paths: [backend, files.folder, start],
        });
    }
    catch (e) {
        throw new Error('@voxgig/build not found from ' + backend +
            ' - is it installed? (npm install)');
    }
    const pkg = node_path_1.default.dirname(pkgjson);
    return {
        backend,
        tm: node_path_1.default.join(backend, 'tm', 'lambda'),
        gen: node_path_1.default.join(backend, 'src', 'gen'),
        pkg,
        pkgtm: node_path_1.default.join(pkg, 'tm', 'lambda'),
    };
}
function pkgVersion(project) {
    return JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(project.pkg, 'package.json'), 'utf8')).version;
}
function sha256(content) {
    return node_crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function readProvenance(project) {
    const p = node_path_1.default.join(project.tm, '.ejected.json');
    return node_fs_1.default.existsSync(p) ? JSON.parse(node_fs_1.default.readFileSync(p, 'utf8')) : {};
}
function writeProvenance(project, prov) {
    node_fs_1.default.mkdirSync(project.tm, { recursive: true });
    node_fs_1.default.writeFileSync(node_path_1.default.join(project.tm, '.ejected.json'), JSON.stringify(prov, null, 2) + '\n');
}
// List each template with the layer that currently provides it.
function listTemplates(start) {
    const project = resolveProject(start);
    const rows = [];
    for (const gen of GENERATORS) {
        const override = node_path_1.default.join(project.gen, gen + '.ts');
        rows.push({
            name: gen,
            kind: 'generator',
            layer: node_fs_1.default.existsSync(override) ?
                'project (src/gen/' + gen + '.ts)' : 'package',
        });
    }
    const frags = node_fs_1.default.readdirSync(project.pkgtm)
        .filter((f) => f.endsWith('.frag')).sort();
    for (const frag of frags) {
        rows.push({
            name: frag,
            kind: 'fragment',
            layer: node_fs_1.default.existsSync(node_path_1.default.join(project.tm, frag)) ?
                'project (tm/lambda/' + frag + ')' : 'package',
        });
    }
    return rows;
}
// Eject a fragment (text template) into backend/tm/lambda/.
function ejectFragment(start, name) {
    const project = resolveProject(start);
    const frag = GENERATOR_FRAG[name] || name;
    const srcpath = node_path_1.default.join(project.pkgtm, frag);
    if (!node_fs_1.default.existsSync(srcpath)) {
        const avail = node_fs_1.default.readdirSync(project.pkgtm)
            .filter((f) => f.endsWith('.frag')).sort();
        throw new Error('unknown fragment: ' + frag +
            ' (available: ' + avail.join(', ') + ')');
    }
    const dest = node_path_1.default.join(project.tm, frag);
    if (node_fs_1.default.existsSync(dest)) {
        throw new Error('already ejected: ' + node_path_1.default.relative(start, dest));
    }
    const content = node_fs_1.default.readFileSync(srcpath, 'utf8');
    node_fs_1.default.mkdirSync(project.tm, { recursive: true });
    node_fs_1.default.writeFileSync(dest, content);
    const prov = readProvenance(project);
    prov[frag] = {
        package: '@voxgig/build',
        version: pkgVersion(project),
        sha256: sha256(content),
    };
    writeProvenance(project, prov);
    return dest;
}
// Eject a generator source (compiled component override) into
// backend/src/gen/<name>.ts, rewiring package-internal imports to the
// public '@voxgig/build' API.
function ejectCode(start, name) {
    const project = resolveProject(start);
    if (!GENERATORS.includes(name)) {
        throw new Error('unknown generator: ' + name +
            ' (available: ' + GENERATORS.join(', ') + ')');
    }
    const srcpath = node_path_1.default.join(project.pkg, 'env', 'lambda', name + '.ts');
    if (!node_fs_1.default.existsSync(srcpath)) {
        throw new Error('template source not shipped by installed ' +
            '@voxgig/build (' + pkgVersion(project) + ') - needs >= 4.1.0');
    }
    const dest = node_path_1.default.join(project.gen, name + '.ts');
    if (node_fs_1.default.existsSync(dest)) {
        throw new Error('already ejected: ' + node_path_1.default.relative(start, dest));
    }
    let src = node_fs_1.default.readFileSync(srcpath, 'utf8');
    // Package-internal imports -> public API.
    src = src
        .replace(/from '\.\/generate'/g, "from '@voxgig/build'")
        .replace(/from '\.\.\/\.\.\/shape\/msg'/g, "from '@voxgig/build'")
        .replace(/from '\.\.\/\.\.\/shape\/conf'/g, "from '@voxgig/build'")
        .replace(/from '\.\.\/\.\.\/yml\/res_dynamo_yml'/g, "from '@voxgig/build'");
    const version = pkgVersion(project);
    src = '// Ejected from @voxgig/build ' + version +
        ' (env/lambda/' + name + '.ts).\n' +
        '// This project copy now OWNS this generator: the build action uses\n' +
        '// it instead of the package default. After editing, run:\n' +
        '//   npm run build && npm run model-build\n' +
        '// Compare with the package version: voxgig-system template diff\n' +
        src;
    node_fs_1.default.mkdirSync(project.gen, { recursive: true });
    node_fs_1.default.writeFileSync(dest, src);
    const prov = readProvenance(project);
    prov['code:' + name] = {
        package: '@voxgig/build',
        version,
        sha256: sha256(node_fs_1.default.readFileSync(srcpath)),
    };
    writeProvenance(project, prov);
    return dest;
}
// For each ejected template, report upstream drift (package version now
// differs from what was ejected) and show package-vs-project diffs.
function diffTemplates(start) {
    const project = resolveProject(start);
    const prov = readProvenance(project);
    const rows = [];
    for (const key of Object.keys(prov).sort()) {
        const rec = prov[key];
        const isCode = key.startsWith('code:');
        const name = isCode ? key.substring(5) : key;
        const pkgfile = isCode ?
            node_path_1.default.join(project.pkg, 'env', 'lambda', name + '.ts') :
            node_path_1.default.join(project.pkgtm, name);
        const projfile = isCode ?
            node_path_1.default.join(project.gen, name + '.ts') :
            node_path_1.default.join(project.tm, name);
        if (!node_fs_1.default.existsSync(pkgfile)) {
            rows.push({ name: key, upstream: 'missing' });
            continue;
        }
        const upstream = sha256(node_fs_1.default.readFileSync(pkgfile)) === rec.sha256 ?
            'unchanged' : 'changed';
        let diff = undefined;
        if (node_fs_1.default.existsSync(projfile)) {
            const res = (0, node_child_process_1.spawnSync)('diff', ['-u', pkgfile, projfile], { encoding: 'utf8' });
            diff = 0 === res.status ? '' : res.stdout;
        }
        rows.push({ name: key, upstream, diff });
    }
    return rows;
}
//# sourceMappingURL=template.js.map