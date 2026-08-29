/* Copyright (c) 2022 Richard Rodger and other contributors, MIT License */


import { describe, test } from 'node:test'
import assert from 'node:assert'

import {
  System,
  Utility,
} from '../system'


const {
  listmsgs,
} = Utility


describe('system', () => {

  test('happy', () => {
  })

  test('listmsgs', () => {
    assert.deepEqual(listmsgs(), [])


    assert.deepEqual(listmsgs({ a: {} }).map(m => m.pattern), [])

    assert.deepEqual(listmsgs({ a: { b: {} } }).map(m => m.pattern), ['a:b'])

    assert.deepEqual(listmsgs({ a: { b: { c: {} } } }).map(m => m.pattern), [])

    assert.deepEqual(listmsgs({ a: { b: { c: { d: {} } } } }).map(m => m.pattern), ['a:b,c:d'])

    assert.deepEqual(listmsgs({ a: { b: { c: { d: { e: {} } } } } }).map(m => m.pattern), [])

    assert.deepEqual(listmsgs({ a: { b: { c: { d: { e: { f: {} } } } } } }).map(m => m.pattern), ['a:b,c:d,e:f'])


    assert.deepEqual(listmsgs({ a: { b: {}, c: {} } }).map(m => m.pattern), ['a:b', 'a:c'])

    assert.deepEqual(listmsgs({ a: { b: {}, c: {} }, d: { e: {} } }).map(m => m.pattern), ['a:b', 'a:c', 'd:e'])

    assert.deepEqual(listmsgs({ a: { b: {}, c: {} }, d: { e: {}, f: {} } }).map(m => m.pattern), ['a:b', 'a:c', 'd:e', 'd:f'])

    assert.deepEqual(listmsgs({
      a: { b: {}, c: { g: {} } },
      d: { e: {}, f: {}, h: { i: {} } }
    }).map(m => m.pattern), ['a:b', 'd:e', 'd:f'])

    assert.deepEqual(listmsgs({
      a: { b: {}, c: { g: { j: {} } } },
      d: { e: {}, f: {}, h: { i: {} } }
    }).map(m => m.pattern), ['a:b', 'a:c,g:j', 'd:e', 'd:f'])

    assert.deepEqual(listmsgs({
      a: { b: {}, c: { g: { j: {} } } },
      d: { e: {}, f: {}, h: { i: { k: {} } } }
    }).map(m => m.pattern), ['a:b', 'a:c,g:j', 'd:e', 'd:f', 'd:h,i:k'])

    assert.deepEqual(listmsgs({
      a: { b: {}, c: { g: { j: { l: { m: {} } } } } },
      d: { e: {}, f: {}, h: { i: { k: {} } } }
    }).map(m => m.pattern), ['a:b', 'a:c,g:j,l:m', 'd:e', 'd:f', 'd:h,i:k'])

    assert.deepEqual(listmsgs({
      a: { b: { $: {}, c: { d: {} } } }
    }).map(m => m.pattern), ['a:b,c:d', 'a:b'])


  })


  // The declared message shape: main.msg is a LIST of definitions, each
  // carrying its pattern as data.
  test('listmsgs-declared', () => {

    assert.deepEqual(listmsgs([
      { pat: [{ aim: 'web' }, { save: 'item' }] }
    ]).map(m => m.pattern), ['aim:web,save:item'])

    // A one-pair pattern, and several definitions side by side.
    assert.deepEqual(listmsgs([
      { pat: [{ get: 'info' }] },
      { pat: [{ aim: 'web' }, { save: 'item' }] },
    ]).map(m => m.pattern), ['get:info', 'aim:web,save:item'])

    // THE REASON THE SHAPE IS A LIST: a gateway proxy and the message it
    // forwards to share their last pattern pair, so a map keyed by message
    // name could not hold both.
    assert.deepEqual(listmsgs([
      { pat: [{ aim: 'todo' }, { save: 'item' }] },
      { pat: [{ aim: 'web' }, { on: 'todo' }, { save: 'item' }], file: './web_save_item' },
    ]).map(m => m.pattern), ['aim:todo,save:item', 'aim:web,on:todo,save:item'])

    // props is what Patrun indexes on, so it must match the chain form.
    assert.deepEqual(listmsgs([
      { pat: [{ aim: 'web' }, { save: 'item' }] }
    ])[0].props, { aim: 'web', save: 'item' })

    // meta is the definition without its pattern: `params` and `file` are the
    // two the runtime reads, and the rest rides along untouched.
    assert.deepEqual(listmsgs([
      {
        pat: [{ aim: 'web' }, { save: 'item' }],
        doc: 'Save an item',
        params: { id: 'string' },
        file: './custom_save',
      }
    ])[0].meta, { doc: 'Save an item', params: { id: 'string' }, file: './custom_save' })

    assert.deepEqual(listmsgs([]), [])

    // Elements that are not definitions are skipped rather than thrown on.
    assert.deepEqual(listmsgs([null, 'nope', {}, { pat: [{ a: 'b' }] }])
      .map(m => m.pattern), ['a:b'])

    // Malformed pairs are dropped (@voxgig/model fails the build on these, so
    // they only arrive from elsewhere). A pair holding two keys is dropped
    // whole: which of them was meant is unknowable, and guessing would
    // silently produce a pattern nobody declared.
    assert.deepEqual(listmsgs([
      { pat: [{ a: 'b' }, 'nope', null, { c: 'd', e: 'f' }, []] }
    ]).map(m => m.pattern), ['a:b'])

    assert.deepEqual(listmsgs([{ pat: [] }]).map(m => m.pattern), [''])
  })


})
