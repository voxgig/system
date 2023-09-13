/* Copyright (c) 2022 Richard Rodger and other contributors, MIT License */


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
    expect(listmsgs()).toEqual([])


    expect(listmsgs({ a: {} }).map(m => m.pattern))
      .toEqual([])

    expect(listmsgs({ a: { b: {} } }).map(m => m.pattern))
      .toEqual(['a:b'])

    expect(listmsgs({ a: { b: { c: {} } } }).map(m => m.pattern))
      .toEqual([])

    expect(listmsgs({ a: { b: { c: { d: {} } } } }).map(m => m.pattern))
      .toEqual(['a:b,c:d'])

    expect(listmsgs({ a: { b: { c: { d: { e: {} } } } } }).map(m => m.pattern))
      .toEqual([])

    expect(listmsgs({ a: { b: { c: { d: { e: { f: {} } } } } } }).map(m => m.pattern))
      .toEqual(['a:b,c:d,e:f'])


    expect(listmsgs({ a: { b: {}, c: {} } }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c'])

    expect(listmsgs({ a: { b: {}, c: {} }, d: { e: {} } }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c', 'd:e'])

    expect(listmsgs({ a: { b: {}, c: {} }, d: { e: {}, f: {} } }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c', 'd:e', 'd:f'])

    expect(listmsgs({
      a: { b: {}, c: { g: {} } },
      d: { e: {}, f: {}, h: { i: {} } }
    }).map(m => m.pattern))
      .toEqual(['a:b', 'd:e', 'd:f'])

    expect(listmsgs({
      a: { b: {}, c: { g: { j: {} } } },
      d: { e: {}, f: {}, h: { i: {} } }
    }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c,g:j', 'd:e', 'd:f'])

    expect(listmsgs({
      a: { b: {}, c: { g: { j: {} } } },
      d: { e: {}, f: {}, h: { i: { k: {} } } }
    }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c,g:j', 'd:e', 'd:f', 'd:h,i:k'])

    expect(listmsgs({
      a: { b: {}, c: { g: { j: { l: { m: {} } } } } },
      d: { e: {}, f: {}, h: { i: { k: {} } } }
    }).map(m => m.pattern))
      .toEqual(['a:b', 'a:c,g:j,l:m', 'd:e', 'd:f', 'd:h,i:k'])

    expect(listmsgs({
      a: { b: { $: {}, c: { d: {} } } }
    }).map(m => m.pattern))
      .toEqual(['a:b,c:d', 'a:b'])


  })



})
