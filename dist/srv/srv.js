"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.make = void 0;
const system_1 = require("../system");
function make(name, require) {
    const srv = function (options) {
        let reload = this.export('reload/make')(require);
        system_1.System.messages(this, options, reload, require);
    };
    Object.defineProperty(srv, 'name', { value: name });
    return srv;
}
exports.make = make;
//# sourceMappingURL=srv.js.map