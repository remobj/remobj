/**
 * Global finalization registry for garbage collection callbacks
 */
const finalizationRegistry = new FinalizationRegistry<() => void>((callback) => callback())

/**
 * Registers a callback to be executed when the target object is garbage collected
 * @param target - The object to watch for garbage collection  
 * @param callback - Function to execute when target is collected
 * @param unregisterToken - Optional token for unregistering the callback
 */
export const onGarbageCollected: (target: WeakKey, callback: () => void, unregisterToken?: WeakKey) => void = 
  finalizationRegistry.register.bind(finalizationRegistry)

/**
 * Unregisters a garbage collection callback
 * @param unregisterToken - The token used when registering
 */
export const unregisterGarbageCollection = (unregisterToken: WeakKey): void => {
  finalizationRegistry.unregister(unregisterToken)
}