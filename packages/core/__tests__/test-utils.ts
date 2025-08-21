/**
 * Removes stack information from data that might be added in development mode
 */
export function removeStackInfo(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(removeStackInfo)
  }

  const result: any = {}
  
  // Copy all properties except stack info
  for (const [key, value] of Object.entries(data)) {
    if (key !== '___stack_internal__' && key !== '___stack_internal_id__') {
      result[key] = removeStackInfo(value)
    }
  }
  
  return result
}

/**
 * Compares data while ignoring stack information
 */
export function expectDataEqual(actual: any, expected: any) {
  const cleanActual = removeStackInfo(actual)
  expect(cleanActual).toEqual(expected)
}

/**
 * Removes traceID from objects recursively
 */
export function removeTraceID(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(removeTraceID)
  }

  const result: any = {}
  
  // Copy all properties except traceID
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'traceID') {
      result[key] = removeTraceID(value)
    }
  }
  
  return result
}