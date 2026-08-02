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



})
