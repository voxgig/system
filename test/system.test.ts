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

  test('msgs', () => {
    expect(listmsgs()).toEqual([])
  })


})
