
const { Gubu } = require('gubu')
const { gubuify } = require('..')

// const Seneca = require('seneca')


// function p1(opts) {
//   this.shared.c1 = { x:1 }

//   this.add('a:1', function a1(msg, reply) {
//     console.log('QQQ', this.shared)
//   })
// }




// const seneca = Seneca().test().use(p1).act('a:1')

let s

console.dir((s=gubuify({a:'Number'}, Gubu)).node(),{depth:null})
console.log(s({a:1}))
// console.log(s({}))


console.dir((s=gubuify({a:'String'}, Gubu)).node(),{depth:null})
console.log(s({a:'A'}))

console.dir((s=gubuify({a:{b:'String'}}, Gubu)).node(),{depth:null})
console.log(s({a:{b:'B'}}))

console.dir((s=gubuify({'a:Open':{b:'String'}}, Gubu)).node(),{depth:null})
console.log(s({a:{b:'B',c:'C'}}))

console.dir((s=gubuify({a:1}, Gubu)).node(),{depth:null})
console.log(s({a:2}))
console.log(s({}))
// console.log(s({a:'A'}))

console.dir((s=gubuify({a:'A'}, Gubu)).node(),{depth:null})
console.log(s({a:'B'}))
console.log(s({}))

