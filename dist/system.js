"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Local = exports.Utility = exports.MakeSrv = exports.System = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utility_1 = require("./lib/utility");
Object.defineProperty(exports, "Utility", { enumerable: true, get: function () { return utility_1.Utility; } });
const make_1 = require("./srv/make");
Object.defineProperty(exports, "MakeSrv", { enumerable: true, get: function () { return make_1.MakeSrv; } });
const { srvmsgs } = utility_1.Utility;
function messages(seneca, options, reload) {
    let srvname = seneca.fixedargs.plugin$.name.replace(/^srv_/, '');
    let model = seneca.context.model;
    let srvmodel = model.main.srv[srvname];
    let msgs = srvmsgs(srvmodel, model);
    console.log('SYSTEM: MESSAGES FOUND', srvname, msgs);
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
    for (const entry of Object.entries(model.main.srv)) {
        let name = entry[0];
        let srv = entry[1];
        let srvpath = path_1.default.join(folder, name, name + '-srv.js');
        if (fs_1.default.existsSync(srvpath)) {
            this.root.use(srvpath, srv.options);
        }
        else {
            this.log.warn('srv-not-found', { name, srvpath: srvpath });
        }
    }
}
exports.Local = Local;
const System = {
    messages,
    prepare,
};
exports.System = System;
//# sourceMappingURL=system.js.map