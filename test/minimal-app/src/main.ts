import { consume,  provide } from '@remobj/core'
const mc = new MessageChannel()
provide({ add: (a: number, b: number) => a + b }, mc.port1)
const c = consume<{add(a: number, b: number): number}>(mc.port2)
console.log(await c.add(5,3))