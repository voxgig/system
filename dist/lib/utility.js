"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = void 0;
const jsonic_1 = require("@tabnas/jsonic");
const patrun_1 = __importDefault(require("patrun"));
// TODO: perform this during model build?
function srvmsgs(srv, model) {
    const allmsgs = listmsgs(model.main.msg);
    const allpat = (0, patrun_1.default)({});
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
// A message definition declares its pattern as a LIST; a chain node never
// does, because every value in a chain node is a map - the next pattern level,
// or the '$' leaf. So this tells the two shapes apart even for a legacy
// pattern pair spelled `pat:`. It is the same discriminator @voxgig/model
// validates the declared shape with (see its producer/msg.ts).
function ismsgdef(val) {
    return null != val && 'object' === typeof val &&
        !Array.isArray(val) && Array.isArray(val.pat);
}
// The pattern pairs of a declared-shape definition, in the walker's path form.
// A malformed pair is skipped rather than thrown on: @voxgig/model fails the
// build on those, so one reaching here means the model came from somewhere
// else, and dropping it degrades better than crashing srv startup.
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
    let entries = 'object' === typeof point ?
        Object.entries(point).filter(entry => !entry[0].includes('$')) : [];
    // A declared-shape definition carries its pattern as data, so it IS a
    // message here, not a node to descend into. Everything else is a chain node
    // and walks as before, which is what lets both shapes appear in one model.
    let points = [];
    for (let entry of entries) {
        if (ismsgdef(entry[1])) {
            let meta = { ...entry[1] };
            delete meta.pat;
            handle(path.concat(msgdefpath(entry[1])), meta);
        }
        else {
            points.push(entry);
        }
    }
    for (let step of points) {
        let key = step[0];
        // TODO: capture error log if step[1] empty (key with no vals)
        for (let val of Object.keys(step[1])) {
            walkmsgs(step[1][val], path.concat([[key, val]]), handle);
        }
    }
    // if any $ meta props, or nothing here at all, we found a msg.
    //
    // This asks about ENTRIES, not the chain nodes among them: a node holding
    // only declared-shape definitions is a container, and must not also emit a
    // patternless message of its own. With no definitions present the two are
    // the same set, so legacy models walk exactly as before.
    if (0 === entries.length || point.$) {
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