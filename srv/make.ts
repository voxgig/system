
import { System } from '../system'

function MakeSrv(name: string, require: any) {
  const srv = function(this: any, options: any) {
    let reload = this.export('reload/make')(require)
    System.messages(this, options, reload)
    System.prepare(this, require)
  }

  Object.defineProperty(srv, 'name', { value: 'srv_' + name })

  return srv
}

export {
  MakeSrv
}
