"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = exports.MakeSrv = exports.System = void 0;
const utility_1 = require("./lib/utility");
Object.defineProperty(exports, "Utility", { enumerable: true, get: function () { return utility_1.Utility; } });
const make_1 = require("./srv/make");
Object.defineProperty(exports, "MakeSrv", { enumerable: true, get: function () { return make_1.MakeSrv; } });
const { srvmsgs } = utility_1.Utility;
function messages(seneca, options, reload) {
    let srvname = seneca.fixedargs.plugin$.name;
    let model = seneca.context.model;
    let srvmodel = model.main.srv[srvname];
    let msgs = srvmsgs(srvmodel, model);
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
const System = {
    messages
};
exports.System = System;
//# sourceMappingURL=system.js.map