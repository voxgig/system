"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = exports.MakeSrv = exports.System = void 0;
exports.gubuify = gubuify;
exports.Local = Local;
exports.Live = Live;
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
    for (let msg of msgs) {
        let action = reload(actpath(msg), { options });
        let params = {};
        if (msg.meta.params) {
            let shape = gubuify(seneca.util.deep(msg.meta.params), seneca.util.Gubu);
            params = shape.node().v;
        }
        seneca.message(msg.pattern, params, action);
    }
}
// Convert string values into Gubu builder expressions.
function gubuify(params, Gubu) {
    if (null == params) {
        return params;
    }
    for (let pn in params) {
        let m = null;
        let pv = params[pn];
        if ('object' === typeof pv) {
            params[pn] = gubuify(pv, Gubu);
        }
        else if ('string' === typeof pv &&
            -1 === pn.indexOf(':') && ('function' === typeof Gubu[(m = ((pv.match(/\s*([A-Z]\w+)([(.\s]|$)/) || []))[1])] ||
            ({ String: 1, Number: 1, Boolean: 1 }[m]))) {
            let png = pn + ':' + pv;
            params[png] = pv;
            delete params[pn];
        }
        else {
            params[pn] = Gubu(pv);
        }
    }
    return Gubu(params);
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
        const makePrepare = require('./' + srvname + '-prepare');
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