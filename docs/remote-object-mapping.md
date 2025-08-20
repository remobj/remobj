# Remote Object Mapping in RemObj

## Überblick

Das RemObj-System ermöglicht es, JavaScript-Objekte über PostMessage-Endpoints (z.B. zwischen Worker, iFrames) transparent zu teilen. Der `provide`-Aufruf macht ein Objekt verfügbar, während `consume` ein Proxy-Objekt erstellt, das sich wie das Original verhält.

## Der Remote-Typ

Der `Remote<T>` Typ transformiert jeden TypeScript-Typ in seine asynchrone Remote-Variante:

```typescript
type Remote<T> = 
  // Symbole werden nicht unterstützt
  T extends symbol ? never :
  // Primitive Typen werden zu Promises
  T extends number | string ? Promise<T> :
  // Konstruktoren bleiben Konstruktoren, aber returnen Promise<Remote<...>>
  T extends new(...args) => R ? new(...args) => Promise<Remote<R>> :
  // Funktionen bleiben Funktionen, aber returnen Promises
  T extends (...args) => R ? (...args) => Promise<...> :
  // Objekte werden rekursiv gemappt (außer verbotene Properties)
  T extends Record<string, unknown> ? { [K in keyof T]: Remote<T[K]> } :
  never
```

## Kommunikationsablauf

### 1. Provider-Seite (`provide`)

```javascript
provide(data, endpoint, { allowWrite: false, name: 'myObject' })
```

- Erstellt einen eindeutigen `providerID`
- Wrapped den Endpoint mit `myfn()` für Argument-Handling
- Lauscht auf eingehende `RemoteCallRequest` Nachrichten
- Traversiert den Property-Path zum angeforderten Wert
- Führt die Operation aus (call, construct, set, await)
- Sendet `RemoteCallResponse` zurück

### 2. Consumer-Seite (`consume`)

```javascript
const remote = consume<typeof originalObject>(endpoint)
```

- Erstellt einen Proxy als Einstiegspunkt
- Jeder Property-Zugriff erstellt einen neuen Sub-Proxy
- Proxy-Operationen werden in `RemoteCallRequest` übersetzt
- Wartet auf `RemoteCallResponse` und löst Promise auf

## Argument-Wrapping Mechanismus

Die `myfn` Funktion behandelt komplexe Argumente intelligent:

### Raw vs. Wrapped Argumente

1. **Raw-Argumente** (direkt serialisierbar):
   - Primitive Werte (string, number, boolean, null, undefined)
   - Plain Objects (nur Object.prototype)
   - Arrays von plain values

2. **Wrapped-Argumente** (als Remote-Objekte):
   - Klassen-Instanzen
   - Objekte mit Custom-Prototypes
   - Funktionen
   - Komplexe verschachtelte Strukturen

```javascript
// Beispiel:
const result = await remote.processData({
  simple: 42,              // raw
  data: [1, 2, 3],        // raw
  complex: new MyClass(), // wrapped -> eigener Sub-Channel
  fn: () => {}           // wrapped -> eigener Sub-Channel
})
```

## Property-Path System

Jeder Zugriff wird als Pfad gespeichert:

```javascript
await remote.module.utils.helper.calculate(5)
// propertyPath: "module/utils/helper/calculate"
// operationType: "call"
// args: [5]
```

## Message-Protokoll

### RemoteCallRequest
```typescript
interface RemoteCallRequest {
  requestID: string      // Eindeutige Request-ID
  consumerID: string     // ID des Consumers
  realmID: string        // Cross-Realm Validation
  operationType: 'call' | 'construct' | 'set' | 'await'
  propertyPath: string   // Pfad wie "module/utils/helper"
  args: any[]           // Argumente für die Operation
}
```

### RemoteCallResponse
```typescript
interface RemoteCallResponse {
  type: 'response'
  requestID: string      // Matched die Request-ID
  resultType: 'result' | 'error'
  result: any           // Ergebnis oder Error
  providerID: string
}
```

## Sicherheitsfeatures

### 1. Forbidden Properties
- `__proto__`, `prototype`, `constructor` blockiert
- Verhindert Prototype-Pollution-Angriffe

### 2. Path-Validation
- Prüft jeden Pfad-Segment auf verbotene Properties
- Validierung vor jeder Operation

### 3. Write-Protection
- Schreibzugriffe nur mit `allowWrite: true`
- Root-Objekt kann nie überschrieben werden

## Garbage Collection Integration

Das System nutzt `WeakRef` und `onGarbageCollected` für automatisches Cleanup:

### 1. Proxy-Caching
- Proxies werden in WeakRef gecacht
- Bei erneuten Zugriffen wird gecachter Proxy verwendet
- Wenn Proxy GC'd wird, wird Cache-Eintrag entfernt

### 2. Sub-Channel Cleanup
- Wrapped Argumente bekommen eigene Channels
- Wenn Consumer-Proxy GC'd wird, wird Channel geschlossen
- Verhindert Memory Leaks bei komplexen Objektgraphen

### 3. Listener Cleanup
- Message-Listener werden entfernt wenn Objekte GC'd werden
- Pending Promises werden gecleart
- Timeouts werden abgebrochen

## Verwendungsbeispiel

```typescript
// Provider-Seite
const api = {
    // Einfache Werte
    version: "1.0.0",
    
    // Funktionen
    calculate(a: number, b: number) { 
        return a + b 
    },
    
    // Objekt-Rückgabe
    getConfig() { 
        return { 
            timeout: 5000,
            retries: 3
        }
    },
    
    // Klassen-Konstruktor
    Logger: class {
        constructor(name: string) {
            this.name = name
        }
        log(msg: string) {
            console.log(`[${this.name}] ${msg}`)
        }
    }
}

provide(api, workerEndpoint, { name: 'MainAPI' })

// Consumer-Seite
const remote = consume<typeof api>(workerEndpoint)

// Primitive Werte
const version = await remote.version  // Promise<string>

// Funktionsaufrufe
const sum = await remote.calculate(5, 3)  // Promise<number>

// Objekt-Rückgaben
const config = await remote.getConfig()  // Promise<{timeout: number, retries: number}>

// Klassen-Instanziierung
const logger = await new remote.Logger('Worker')  // Promise<Remote<Logger>>
await logger.log('Hello from worker!')  // Promise<void>
```

## Multiplexing und Sub-Channels

Wenn komplexe Objekte als Argumente übergeben werden:

1. System prüft mit `hasOnlyPlainObjects()`
2. Komplexe Objekte bekommen eigene Sub-Channel
3. Sub-Channel ID wird anstelle des Objekts übertragen
4. Empfänger erstellt Remote-Proxy für Sub-Channel

```javascript
// Automatisches Wrapping bei komplexen Argumenten
const complexArg = new MyClass()
await remote.process(complexArg)
// complexArg wird automatisch als Remote-Objekt gewrapped
```

## Performance-Überlegungen

- **Proxy-Caching**: Verhindert mehrfache Proxy-Erstellung
- **Lazy Evaluation**: Proxies werden erst bei Zugriff erstellt
- **Multiplexing**: Ein Endpoint für mehrere Remote-Objekte
- **Plain Object Optimization**: Einfache Objekte werden direkt serialisiert

## Einschränkungen

1. **Keine Symbole**: Symbol-Properties werden ignoriert
2. **Async-Only**: Alle Operationen sind asynchron
3. **Keine zirkulären Referenzen**: Bei wrapped Objekten
4. **Serialisierbarkeit**: Raw-Argumente müssen strukturiert klonbar sein