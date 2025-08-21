/**
 * Build format configurations
 */
export const BUILD_FORMATS = {
  "esm-production": {
    file: (name) => `${name}.esm.js`,
    format: "es",
    defines: {
      __DEV__: "false",
      __TEST__: "false",
      __BROWSER__: "false",
      __PROD_DEVTOOLS__: "false",
    },
  },
  "dts": {
    file: (name) => `${name}.dts.d.ts`,
    format: "es",
    defines: {
      __DEV__: "false",
      __TEST__: "false",
      __BROWSER__: "false",
      __PROD_DEVTOOLS__: "false",
    },
  },
  "esm-bundler": {
    file: (name) => `${name}.bundler.js`,
    format: "es",
    defines: {
      __TEST__: "false",
      __BROWSER__: "false",
    },
  },
  umd: {
    file: (name) => `${name}.umd.js`,
    format: "umd",
    defines: {
      __DEV__: "false",
      __TEST__: "false",
      __BROWSER__: "true",
      __PROD_DEVTOOLS__: "false",
    },
  },
};

/**
 * Creates output configuration for a specific format
 * @param {string} packageName - Name of the package
 * @param {string} format - Build format (esm-production, esm-bundler, umd)
 * @param {object} buildOptions - Build options from package.json
 * @returns {object} Rolldown output configuration
 */
export function createOutputConfig(packageName, format, buildOptions) {
  const formatConfig = BUILD_FORMATS[format];
  if (!formatConfig) {
    throw new Error(`Unknown build format: ${format}`);
  }

  // Create globals mapping for UMD builds
  const globals = format === "umd" ? {
    "@remobj/shared": "RemObjShared",
    "@remobj/core": "RemObjCore",
    "@remobj/add": "RemObjAdd",
    "@remobj/mul": "RemObjMul"
  } : undefined;

  return {
    file: formatConfig.file(packageName),
    format: formatConfig.format,
    name: format === "umd" ? buildOptions.globalName : undefined,
    globals,
  };
}

/**
 * Gets define flags for a specific format
 * @param {string} format - Build format
 * @param {string} version - Package version
 * @param {boolean} isDev - Whether this is a development build
 * @returns {object} Define flags
 */
export function getDefineFlags(format, version, isDev = false) {
  const formatConfig = BUILD_FORMATS[format];
  if (!formatConfig) {
    throw new Error(`Unknown build format: ${format}`);
  }

  return {
    ...formatConfig.defines,
    __VERSION__: JSON.stringify(version),
    // Override __DEV__ if this is a development build
    ...(isDev && { __DEV__: "true" }),
  };
}

/**
 * Resolves external dependencies for a given format
 * @param {string} format - Build format
 * @param {object} pkg - Package.json content
 * @param {object} buildOptions - Build options
 * @returns {string[]} External dependencies
 */
export function resolveExternals(format, pkg, buildOptions = {}) {
  const userExternal = buildOptions.external || [];

  switch (format) {
    case "umd": {
      // UMD builds bundle everything for standalone usage
      return userExternal;
    }

    case "esm-production":
    case "esm-bundler": {
      // ESM builds keep dependencies external for bundler compatibility
      return [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        ...userExternal,
      ];
    }

    default: {
      return userExternal;
    }
  }
}
