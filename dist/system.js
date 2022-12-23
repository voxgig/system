"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Live = exports.Local = exports.Utility = exports.MakeSrv = exports.System = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utility_1 = require("./lib/utility");
Object.defineProperty(exports, "Utility", { enumerable: true, get: function () { return utility_1.Utility; } });
const make_1 = require("./srv/make");
Object.defineProperty(exports, "MakeSrv", { enumerable: true, get: function () { return make_1.MakeSrv; } });
const { srvmsgs, deep } = utility_1.Utility;
function messages(seneca, options, reload) {
    let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '');
    let model = seneca.context.model;
    let srvmodel = model.main.srv[srvname];
    let msgs = srvmsgs(srvmodel, model);
    // console.log('SYSTEM: MESSAGES FOUND', srvname,
    //             msgs.map(m=>m.pattern))
    for (let msg of msgs) {
        seneca.message(msg.pattern, reload(actpath(msg), { options }));
    }
}
function actpath(msg) {
    if (msg.meta.file) {
        return msg.meta.file;
    }
    let pairs = msg.pattern.split(/\s*,\s*/);
    // TODO: maybe take more than just the last one!
    let path = './' + pairs[pairs.length - 1].replace(/:/g, '_');
    return path;
}
function prepare(seneca, require) {
    let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '');
    try {
        const makePrepare = require('./' + srvname + '-prepare.js');
        seneca.prepare(makePrepare());
    }
    catch (e) {
        if ('MODULE_NOT_FOUND' !== e.code) {
            throw e;
        }
    }
}
function Local(options) {
    const model = this.context.model;
    const folder = options.srv.folder;
    // index by srv name, overrides model
    const srvOptions = options.options || {};
    for (const entry of Object.entries(model.main.srv)) {
        let name = entry[0];
        let srv = entry[1];
        let srvpath = path_1.default.join(folder, name, name + '-srv.js');
        if (fs_1.default.existsSync(srvpath)) {
            let srvopts = deep({}, srv.options, srvOptions[name]);
            this.root.use(srvpath, srvopts);
        }
        else {
            this.log.warn('srv-not-found', { name, srvpath: srvpath });
        }
    }
}
exports.Local = Local;
function Live(options) {
    const model = this.context.model;
    const srvname = options.srv.name;
    let srvdef = model.main.srv[srvname];
    srvdef.name = srvname;
    let deps = srvdef.deps || {};
    let srvs = Object
        .entries(deps)
        .reduce(((srvdefs, dep) => {
        let depname = dep[0];
        let depsrv = model.main.srv[depname];
        depsrv.name = depname;
        srvdefs.push(depsrv);
        return srvdefs;
    }), []);
    srvs.push(srvdef);
    useSrvs(this, srvs, options, model);
}
exports.Live = Live;
function useSrvs(seneca, srvs, options, model) {
    const folder = options.srv.folder;
    // index by srv name, overrides model
    const srvOptions = options.options || {};
    for (const srv of srvs) {
        let name = srv.name;
        let srvpath = path_1.default.join(folder, name, name + '-srv.js');
        if (fs_1.default.existsSync(srvpath)) {
            let srvopts = deep({}, srv.options, srvOptions[name]);
            seneca.root.use(srvpath, srvopts);
        }
        else {
            seneca.log.warn('srv-not-found', { name, srvpath: srvpath });
        }
    }
}
const System = {
    messages,
    prepare,
};
exports.System = System;
//# sourceMappingURL=system.js.map