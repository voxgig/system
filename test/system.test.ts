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


  // The declared message shape: a flat entry per message, keyed by name, with
  // the pattern as data. Told apart from a chain node by `pat` being a LIST.
  test('listmsgs-declared', () => {

    assert.deepEqual(listmsgs({
      save_item: { pat: [{ aim: 'web' }, { save: 'item' }] }
    }).map(m => m.pattern), ['aim:web,save:item'])

    // A one-pair pattern, and several definitions side by side.
    assert.deepEqual(listmsgs({
      get_info: { pat: [{ get: 'info' }] },
      save_item: { pat: [{ aim: 'web' }, { save: 'item' }] },
    }).map(m => m.pattern), ['get:info', 'aim:web,save:item'])

    // props is what Patrun indexes on, so it must match the chain form.
    assert.deepEqual(listmsgs({
      save_item: { pat: [{ aim: 'web' }, { save: 'item' }] }
    })[0].props, { aim: 'web', save: 'item' })

    // meta is the definition without its pattern: `params` and `file` are the
    // two the runtime reads, and the rest rides along untouched.
    assert.deepEqual(listmsgs({
      save_item: {
        pat: [{ aim: 'web' }, { save: 'item' }],
        doc: 'Save an item',
        params: { id: 'string' },
        file: './custom_save',
      }
    })[0].meta, { doc: 'Save an item', params: { id: 'string' }, file: './custom_save' })

    // A container of definitions is not an empty leaf: it must not also emit a
    // patternless message of its own.
    assert.deepEqual(listmsgs({
      save_item: { pat: [{ save: 'item' }] }
    }).map(m => m.pattern), ['save:item'])

    // Both shapes in one model.
    assert.deepEqual(listmsgs({
      a: { b: {} },
      save_item: { pat: [{ aim: 'web' }, { save: 'item' }] },
    }).map(m => m.pattern), ['aim:web,save:item', 'a:b'])

    // A definition under a chain prefix keeps the prefix.
    assert.deepEqual(listmsgs({
      a: { b: { save_item: { pat: [{ save: 'item' }] } } }
    }).map(m => m.pattern), ['a:b,save:item'])

    // A legacy pattern pair spelled `pat:` is still a chain node - its value
    // is a map, not a list - so the discriminator does not misread it.
    assert.deepEqual(listmsgs({
      pat: { web: {} }
    }).map(m => m.pattern), ['pat:web'])

    // Malformed pairs are dropped rather than thrown on (@voxgig/model fails
    // the build on these, so they only arrive from elsewhere). A pair holding
    // two keys is dropped whole: which of them was meant is unknowable, and
    // guessing would silently produce a pattern nobody declared.
    assert.deepEqual(listmsgs({
      x: { pat: [{ a: 'b' }, 'nope', null, { c: 'd', e: 'f' }, []] }
    }).map(m => m.pattern), ['a:b'])

    assert.deepEqual(listmsgs({ x: { pat: [] } }).map(m => m.pattern), [''])
  })



})
