"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeSrv = void 0;
const system_1 = require("../system");
function MakeSrv(name, require) {
    const srv = function (options) {
        let reload = this.export('reload/make')(require);
        system_1.System.messages(this, options, reload);
        system_1.System.prepare(this, require);
    };
    Object.defineProperty(srv, 'name', { value: 'srv_' + name });
    return srv;
}
exports.MakeSrv = MakeSrv;
//# sourceMappingURL=make.js.map