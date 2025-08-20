export type Listener<T> = (this: unknown, ev: MessageEvent) => any

export interface PostMessageEndpointBase<T = unknown> {
  /**
   * Sends a message to the endpoint
   * @param data - The data to send
   */
  postMessage(data: T): void

  /**
   * Adds an event listener for incoming messages
   * @param type - The event type ('message')
   * @param listener - The message event listener
   */
  addEventListener(type: 'message', listener: Listener<T>): void;

  /**
   * Removes an event listener for incoming messages
   * @param type - The event type ('message')
   * @param listener - The message event listener to remove
   */
  removeEventListener(type: 'message', listener: Listener<T>): void;
}

export type PostMessageEndpointString = PostMessageEndpointBase<string>
export type PostMessageEndpoint = PostMessageEndpointBase<any>