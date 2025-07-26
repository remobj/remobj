/**
 * Global compile-time flags used by the remobj library.
 * These are meant to be defined by the user's bundler.
 */

declare global {
  /**
   * Development mode flag. Should be defined by your bundler.
   * Typically set to: process.env.NODE_ENV !== 'production'
   * 
   * When true, enables additional debugging and devtools features.
   */
  const __DEV__: boolean;

  /**
   * Production devtools flag. Should be defined by your bundler.
   * Set to true if you want devtools enabled even in production builds.
   * 
   * Default should be false for security and performance.
   */
  const __PROD_DEVTOOLS__: boolean;
}

export {};