/**
 * Validation utilities for manifest and package names
 */

/**
 * Validates a package name according to npm naming rules
 *
 * Package names must:
 * - Be lowercase
 * - Contain only alphanumeric characters, hyphens, and underscores
 * - Not start with a dot or underscore
 * - Be between 1 and 214 characters
 *
 * @param name - Package name to validate
 * @returns Validation result with error message if invalid
 */
export function validatePackageName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Package name cannot be empty' };
  }

  if (name.length > 214) {
    return { valid: false, error: 'Package name must be 214 characters or less' };
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    return { valid: false, error: 'Package name cannot start with . or _' };
  }

  if (name !== name.toLowerCase()) {
    return { valid: false, error: 'Package name must be lowercase' };
  }

  // Allow alphanumeric, hyphens, underscores, and forward slashes (for scoped packages)
  const validPattern = /^[a-z0-9@/_-]+$/;
  if (!validPattern.test(name)) {
    return {
      valid: false,
      error:
        'Package name can only contain lowercase letters, numbers, hyphens, underscores, and @ / for scoped packages',
    };
  }

  // Reserved names (npm restrictions)
  const reservedNames = ['node_modules', 'favicon.ico'];
  if (reservedNames.includes(name)) {
    return { valid: false, error: `'${name}' is a reserved package name` };
  }

  return { valid: true };
}

/**
 * Validates an organization name
 *
 * Organization names should:
 * - Not be empty
 * - Be reasonable length (1-100 characters)
 * - Can contain any characters for display purposes
 *
 * @param name - Organization name to validate
 * @returns Validation result with error message if invalid
 */
export function validateOrganizationName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Organization name cannot be empty' };
  }

  if (name.trim().length > 100) {
    return { valid: false, error: 'Organization name must be 100 characters or less' };
  }

  return { valid: true };
}

/**
 * Validates a project name
 *
 * Project names should:
 * - Not be empty
 * - Be reasonable length (1-100 characters)
 * - Can contain any characters for display purposes
 *
 * @param name - Project name to validate
 * @returns Validation result with error message if invalid
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  if (name.trim().length > 100) {
    return { valid: false, error: 'Project name must be 100 characters or less' };
  }

  return { valid: true };
}

/**
 * Validates that a directory name is safe for file system operations
 *
 * @param name - Directory name to validate
 * @returns Validation result with error message if invalid
 */
export function validateDirectoryName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Directory name cannot be empty' };
  }

  // Disallow path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return { valid: false, error: 'Directory name cannot contain path separators or ..' };
  }

  // Disallow special characters that could cause issues on Windows or Unix
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Directory name contains invalid characters' };
  }

  // Reserved names on Windows
  const reservedWindows = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];
  if (reservedWindows.includes(name.toUpperCase())) {
    return { valid: false, error: `'${name}' is a reserved name on Windows` };
  }

  return { valid: true };
}
