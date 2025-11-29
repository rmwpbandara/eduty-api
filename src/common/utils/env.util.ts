/**
 * Environment utility functions
 */

/**
 * Check if the current environment is production or staging
 * (non-development environments)
 */
export function isProductionLike(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'production' || env === 'staging';
}

/**
 * Check if the current environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if the current environment is staging
 */
export function isStaging(): boolean {
  return process.env.NODE_ENV === 'staging';
}

/**
 * Check if the current environment is test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

