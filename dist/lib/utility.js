"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = void 0;
const jsonic_next_1 = require("@jsonic/jsonic-next");
// const Seneca = require('seneca')
const Patrun = require('patrun');
// TODO: perform this during model build?
function srvmsgs(srv, model) {
    const allmsgs = listmsgs(model.main.msg);
    // const allpat = Seneca.util.Patrun()
    const allpat = Patrun();
    allmsgs.forEach((msg) => allpat.add(msg.props, msg));
    // TODO: need an option to listmsgs to just list patterns
    const srvpats = listmsgs(srv.in).map(m => m.props);
    const srvmsgs = [];
    srvpats.reduce((a, pat) => (a.push(...allpat
        .list(pat)
        .map((o) => o.data)), a), srvmsgs);
    return srvmsgs;
}
function listmsgs(point) {
    if (null == point)
        return [];
    let msgs = [];
    walkmsgs(point, [], (path, meta) => {
        let msg = {
            pattern: path.map((part) => part[0] + ':' + part[1]).join(','),
            props: path.reduce((a, part) => (a[part[0]] = part[1], a), {}),
            meta,
        };
        msgs.push(msg);
    });
    return msgs;
}
function walkmsgs(point, path, handle) {
    // console.log('WM', point, path)
    let points = 'object' === typeof point ?
        Object.entries(point).filter(entry => !entry[0].includes('$')) : [];
    for (let step of points) {
        let key = step[0];
        // TODO: capture error log if step[1] empty (key with no vals)
        for (let val of Object.keys(step[1])) {
            walkmsgs(step[1][val], path.concat([[key, val]]), handle);
        }
    }
    // if any $ meta props, or no points, we found a msg
    if (0 === points.length) {
        const meta = point.$ || {};
        handle(path, meta);
    }
}
const Utility = {
    srvmsgs,
    listmsgs,
    deep: jsonic_next_1.util.deep,
};
exports.Utility = Utility;
//# sourceMappingURL=utility.js.map