/**
 * The current version of the RemObj library
 * @constant
 */
export const version: string = __VERSION__
/**
 * Unique identifier for this realm/instance
 * Generated once per runtime to identify message sources
 * @constant
 */
export const realmId: string = /*#__PURE__*/ crypto.randomUUID()