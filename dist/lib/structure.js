"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Structure = void 0;
const model_1 = require("@voxgig/model");
function entity(model) {
    let entries = (0, model_1.dive)(model.main.ent);
    let entMap = {};
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        let path = entry[0];
        // TODO: move EntShape to @voxgig/model
        // let ent = EntShape(entry[1])
        let ent = entry[1];
        // console.log('ENT', path, ent)
        let valid = ent.valid || {};
        Object.entries(ent.field).map((n) => {
            let name = n[0];
            let field = n[1];
            // console.log('FV', name, field)
            let fv = field.kind;
            if (field.valid) {
                let vt = typeof field.valid;
                if ('string' === vt) {
                    fv += '.' + field.valid;
                }
                else {
                    fv = field.valid;
                }
            }
            valid[name] = fv;
        });
        // console.log(path, valid)
        entMap[path[0] + '/' + path[1]] = {
            valid_json: valid
        };
    }
    return entMap;
}
const Structure = {
    entity
};
exports.Structure = Structure;
//# sourceMappingURL=structure.js.map