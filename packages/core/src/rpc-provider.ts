import { isArray, isFunction, isObject, isString } from "@remobj/shared"
import { createMultiplexedEndpoint } from "./multiplex"
import type { PostMessageEndpoint } from "./types"
import { devtools, getTraceID } from "./devtools"
import { createArgumentWrappingEndpoint } from "./rpc-wrapper"
import type {
    ForbiddenProperty,
    ProvideConfig,
    RemoteCallRequest,
    RemoteCallResponse
} from "./rpc-types";
import {
    FORBIDDEN_PROPERTIES
} from "./rpc-types"

// Constants for connection management
const PROVIDER_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function provide(data: any, endpoint: PostMessageEndpoint, config: ProvideConfig = {}): void {
    const { allowWrite = false, name = '' } = config
    const providerID: string = /*#__PURE__*/ crypto.randomUUID()
    const multiplexedEndpoint = /*#__PURE__*/ createArgumentWrappingEndpoint(createMultiplexedEndpoint(endpoint), name + ' -> ArgumentWrapper')
    const registered = new Set<string>()

    let timeoutHandle: any;
    const setProviderTimeout = () => {
        if (timeoutHandle) { clearTimeout(timeoutHandle) }
        return timeoutHandle = setTimeout(() => multiplexedEndpoint.removeEventListener('message', messageListener), PROVIDER_TIMEOUT_MS)
    }

    const messageListener = async (event: MessageEvent) => {
        setProviderTimeout()
        const messageData: RemoteCallRequest = event.data


        if ((__DEV__ || __PROD_DEVTOOLS__)) {
            const traceID = getTraceID(messageData)
            devtools(traceID, "event", providerID, "PROVIDER", name, '', messageData)
        }

        const sendResponse = async (data: any, err?: any) => {
            let result: any
            let resultType: 'error' | 'result' = err ? 'error' : 'result'

            if (err) {
                result = err
            } else {
                try {
                    result = await data
                } catch (error) {
                    resultType = 'error'
                    result = error
                }
            }

            const returnData: RemoteCallResponse = {
                type: 'response',
                requestID: messageData.requestID,
                resultType,
                result,
                providerID,
                consumerID: messageData.consumerID
            }


            if ((__DEV__ || __PROD_DEVTOOLS__)) {
                const traceID = getTraceID(messageData, returnData)
                devtools(traceID, "postMessage", providerID, "PROVIDER", name, '', returnData)
            }

            multiplexedEndpoint.postMessage(returnData)
        }

        const sendError = (err: any) => sendResponse(undefined, err)

        // Validate input
        if (!isString(messageData.propertyPath) || !isString(messageData.operationType) || !isArray(messageData.args)) {
            return sendError(new Error(__DEV__ ? `ACCESS DENIED - Data operationType or args.` : `E003`))
        }

        // Parse property chain and check for forbidden properties
        const propertyChain = messageData.propertyPath.split('/').filter(key => key)

        // Navigate to target property
        let target = data
        let navigationLength = propertyChain.length;

        // Validate set operation
        if (messageData.operationType === 'set') {
            if (propertyChain.length === 0) {
                return sendError(new Error(__DEV__ ? 'ACCESS DENIED - Root ist not settable.' : `E004`))
            }
            navigationLength--;
        }

        for (let i = 0; i < navigationLength; i++) {
            if (FORBIDDEN_PROPERTIES.includes(propertyChain[i] as ForbiddenProperty) || !isObject(target)) {
                return sendError(new Error(__DEV__ ? `ACCESS DENIED - Access to property '${propertyChain[i]}' is forbidden` : `E005`))
            }
            target = target[propertyChain[i]]
        }

        // Execute operation
        const lastProperty = propertyChain[propertyChain.length - 1]
        try {
            const op = messageData.operationType;
            if (op === 'gc-register') {
                return registered.add(messageData.args[0])
            } if (op === 'gc-collect') {
                registered.delete(messageData.args[0])
                return registered.size === 0 && multiplexedEndpoint.removeEventListener('message', messageListener)
            } if (op === 'ping') {
                // Ping received, connection is alive
                return sendResponse(true)
            } if (op === 'await') {
                return sendResponse(target)
            } if (op === 'call') {
                if (isFunction(target)) {
                    return sendResponse(target(...messageData.args))
                }
                return sendError(new Error(__DEV__ ? `REMOTE IS NOT A FUNCTION - You tried to call a function this is not a function.` : `E007`))
            } if (op === 'construct') {
                return sendResponse(new target(...messageData.args))
            } if (op === 'set') {
                if (allowWrite) {
                    if (FORBIDDEN_PROPERTIES.includes(lastProperty as ForbiddenProperty)) {
                        return sendError(new Error(__DEV__ ? `ACCESS DENIED - Access to property '${lastProperty}' is forbidden for security reasons` : `E008`))
                    }

                    if (Object.getOwnPropertyDescriptor(target, lastProperty)?.writable) {
                        target[lastProperty] = messageData.args[0]
                        return sendResponse(true)
                    }
                    return sendError(new Error(__DEV__ ? 'ACCESS DENIED - WRITE TO READONLY NOT ALLOWED' : `E009`))

                }
                return sendError(new Error(__DEV__ ? 'ACCESS DENIED - WRITE NOT ALLOWED' : `E010`))
            }
        } catch (error) {
            return sendError(error)
        }
        return sendError(new Error(__DEV__ ? `Unknown operation type: ${messageData.operationType}` : `E011`))
    }

    multiplexedEndpoint.addEventListener('message', messageListener)

    // Note: Cleanup is handled by the timeout mechanism and gc-collect messages
    // to ensure proper lifecycle management of the message listener
}