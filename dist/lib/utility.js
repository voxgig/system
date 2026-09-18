"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = void 0;
const jsonic_1 = require("@tabnas/jsonic");
const patrun_1 = __importDefault(require("patrun"));
function srvmsgs(srv, model) {
    const allmsgs = listmsgs(model.main.msg);
    const allpat = (0, patrun_1.default)({});
    allmsgs.forEach((msg) => allpat.add(msg.props, msg));
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
// A message definition declares its pattern as a LIST, so it is told apart
// from a chain node - whose values are always maps, the next pattern level or
// the '$' leaf - even when spelled `pat:`. Same discriminator @voxgig/model
// validates the declared shape with.
function ismsgdef(val) {
    return null != val && 'object' === typeof val &&
        !Array.isArray(val) && Array.isArray(val.pat);
}
// The pattern pairs of a definition, in the walker's path form. A malformed
// pair is skipped rather than thrown on: @voxgig/model fails the build on
// those, so one reaching here means the model came from somewhere else, and
// dropping it degrades better than crashing srv startup.
function msgdefpath(def) {
    let path = [];
    for (let pair of def.pat) {
        if (null == pair || 'object' !== typeof pair || Array.isArray(pair)) {
            continue;
        }
        let keys = Object.keys(pair);
        if (1 === keys.length) {
            path.push([keys[0], pair[keys[0]]]);
        }
    }
    return path;
}
function walkmsgs(point, path, handle) {
    if (Array.isArray(point)) {
        for (let def of point) {
            if (ismsgdef(def)) {
                let meta = { ...def };
                delete meta.pat;
                handle(path.concat(msgdefpath(def)), meta);
            }
        }
        return;
    }
    let points = 'object' === typeof point ?
        Object.entries(point).filter(entry => !entry[0].includes('$')) : [];
    for (let step of points) {
        let key = step[0];
        for (let val of Object.keys(step[1])) {
            walkmsgs(step[1][val], path.concat([[key, val]]), handle);
        }
    }
    if (0 === points.length || point.$) {
        const meta = point.$ || {};
        handle(path, meta);
    }
}
const Utility = {
    srvmsgs,
    listmsgs,
    deep: jsonic_1.util.deep,
};
exports.Utility = Utility;
//# sourceMappingURL=utility.js.map