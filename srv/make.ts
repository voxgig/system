
import { System } from '../system'

function MakeSrv(name: string, require: any) {
  const srv = function(this: any, options: any) {
    let reload = this.export('reload/make')(require)
    System.messages(this, options, reload)
  }

  Object.defineProperty(srv, 'name', { value: name })
  return srv
}

export {
  MakeSrv
}
