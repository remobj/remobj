import { isObject } from "@remobj/shared";
import { realmId } from "./constants";

let devEP: WebSocket
export function setDevtoolsEP(ep: WebSocket): void {
    if(__DEV__ || __PROD_DEVTOOLS__) {devEP = ep}
}

export function devtools(traceID: string, side: 'in' | 'out' | 'postMessage' | 'event', objectID: string, type: string, name: string, subName: string, data: any): void {
  console.log(JSON.stringify({
    side,
    objectID,
    type,
    name,
    data
  }, undefined, 2))
  devEP?.send(JSON.stringify({
    traceID,
    side,
    objectID,
    type, 
    subName,
    data,
    realmId,
    timeStamp: performance.now(),
    date: (new Date().toISOString())
  }))
}

export const getTraceID = (...data: unknown[]): string => {
  if(__DEV__ || __PROD_DEVTOOLS__) {
    let traceID: string = ''
    for (let i = 0; i < data.length; i++) {
      const el = data[i];
      if(isObject(el) && 'traceID' in el) {
        traceID = el.traceID as string
        break;
      }
    }

    if (!traceID) {
      traceID = crypto.randomUUID() + ':0'
    }

    const [main, count] = traceID.split(':')
    traceID = `${main}:${Number.parseInt(count, 10) + 1}`

    for (let i = 0; i < data.length; i++) {
      const el = data[i];
      if(isObject(el)) {
        el.traceID = traceID
      }
    }
    

    return traceID
  }
  return ''
}