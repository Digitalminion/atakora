/**
 * Session Security Configuration Examples
 *
 * This file demonstrates the new session security configuration features
 * added to enhance protection against session hijacking, XSS, and CSRF attacks.
 */

import { SessionBuilder } from './session';
import { hours, minutes, days } from '../common/duration';

// Example 1: High-security configuration for financial application
export function createHighSecuritySession() {
  return new SessionBuilder()
    .duration(hours(2)) // Short session duration
    .sliding(false) // Fixed expiration, no renewal
    .storage('redis') // Distributed storage
    .cookieOptions({
      httpOnly: true, // Prevent JavaScript access
      secure: true, // HTTPS only
      sameSite: 'strict', // Strict CSRF protection
      domain: '.example.com', // Limit to domain
      path: '/', // Limit to path
    })
    .fingerprinting(true, ['ip', 'userAgent', 'acceptHeaders']) // Full fingerprinting
    .concurrentSessions(1, 'invalidate-all') // Single session only
    .rotation(true, minutes(30)) // Rotate every 30 minutes
    ._build();
}

// Example 2: Balanced security for typical web application
export function createStandardSession() {
  return new SessionBuilder()
    .duration(hours(8)) // Standard workday duration
    .sliding(true) // Renew on activity
    .storage('redis')
    .cookieOptions({
      httpOnly: true, // XSS protection
      secure: true, // HTTPS in production
      sameSite: 'lax', // Balanced CSRF protection
    })
    .fingerprinting(true, ['ip', 'userAgent']) // Basic fingerprinting
    .concurrentSessions(5, 'invalidate-oldest') // Allow multiple devices
    .rotation(true) // Rotate on privilege elevation
    ._build();
}

// Example 3: Development configuration
export function createDevelopmentSession() {
  return new SessionBuilder()
    .duration(days(7)) // Long duration for dev
    .sliding(true)
    .storage('memory') // In-memory for simplicity
    .cookieOptions({
      httpOnly: true,
      secure: false, // Allow HTTP in dev
      sameSite: 'lax',
    })
    .fingerprinting(false) // Disable for testing flexibility
    .concurrentSessions(10, 'reject') // Many concurrent sessions
    .rotation(false) // No rotation in dev
    ._build();
}

// Example 4: Using the security builder function
export function createCustomSecuritySession() {
  return new SessionBuilder()
    .duration(hours(4))
    .sliding(true)
    .storage('cosmos')
    .security((security) =>
      security
        .cookieOptions({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: '.app.example.com',
        })
        .fingerprinting(true, ['ip'])
        .concurrentSessions(3, 'invalidate-oldest')
        .rotation(true, hours(1))
    )
    ._build();
}

// Example 5: Mobile app backend with API tokens
export function createMobileApiSession() {
  return new SessionBuilder()
    .duration(days(30)) // Long-lived for mobile
    .sliding(true)
    .storage('cosmos') // Geo-distributed
    .security({
      tokenGenerator: () => {
        // Custom token generation for mobile apps
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      },
      cookieOptions: {
        httpOnly: true,
        secure: true,
        sameSite: 'none', // Cross-origin mobile requests
      },
      fingerprinting: {
        enabled: true,
        factors: ['userAgent'], // Device fingerprinting
      },
      concurrent: {
        maxSessions: 3, // Phone, tablet, web
        strategy: 'invalidate-oldest',
      },
      rotation: {
        onElevation: true,
        interval: days(7), // Weekly rotation
      },
    })
    ._build();
}

// Example 6: Internal admin panel
export function createAdminSession() {
  return new SessionBuilder()
    .duration(hours(1)) // Short admin sessions
    .sliding(false) // Fixed duration
    .storage('redis')
    .cookieOptions({
      httpOnly: true,
      secure: true,
      sameSite: 'strict', // Strict for admin
      path: '/admin', // Limit to admin path
    })
    .fingerprinting(true, ['ip', 'userAgent', 'acceptHeaders'])
    .concurrentSessions(1, 'invalidate-all') // One admin session only
    .rotation(true, minutes(15)) // Frequent rotation
    ._build();
}

// Example 7: Public kiosk mode
export function createKioskSession() {
  return new SessionBuilder()
    .duration(minutes(15)) // Very short sessions
    .sliding(false) // No renewal
    .storage('memory')
    .cookieOptions({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })
    .fingerprinting(false) // Shared device, no fingerprinting
    .concurrentSessions(1, 'invalidate-all') // Single session per kiosk
    .rotation(false) // No rotation for short sessions
    ._build();
}

// Demonstration of all security features
export function demonstrateAllFeatures() {
  const config = new SessionBuilder()
    // Basic session configuration
    .duration(hours(6))
    .sliding(true)
    .storage('redis')
    .ttl(hours(7)) // Storage TTL longer than session

    // Security configuration using object syntax
    .security({
      // Custom token generation
      tokenGenerator: () => crypto.randomUUID(),

      // Cookie security settings
      cookieOptions: {
        httpOnly: true, // Prevent XSS attacks
        secure: true, // HTTPS only
        sameSite: 'lax', // CSRF protection
        domain: '.example.com',
        path: '/',
      },

      // Session fingerprinting
      fingerprinting: {
        enabled: true,
        factors: ['ip', 'userAgent', 'acceptHeaders'],
      },

      // Concurrent session management
      concurrent: {
        maxSessions: 5,
        strategy: 'invalidate-oldest',
      },

      // Session rotation
      rotation: {
        onElevation: true, // Rotate on privilege change
        interval: hours(2), // Periodic rotation
      },
    })
    ._build();

  return config;
}

// Type safety demonstration
export function typeChecking() {
  const builder = new SessionBuilder();

  // These all have proper TypeScript types
  const withCookies = builder.cookieOptions({
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // Type: 'strict' | 'lax' | 'none'
  });

  const withFingerprinting = builder.fingerprinting(
    true,
    ['ip', 'userAgent'] // Type: Array<'ip' | 'userAgent' | 'acceptHeaders'>
  );

  const withConcurrent = builder.concurrentSessions(
    5,
    'reject' // Type: 'reject' | 'invalidate-oldest' | 'invalidate-all'
  );

  const withRotation = builder.rotation(
    true,
    hours(1) // Type: Duration
  );

  // Full type safety in the built config
  const config = builder._build();

  // Access typed properties
  console.log(config.security?.cookieOptions?.httpOnly); // boolean | undefined
  console.log(config.security?.fingerprinting?.enabled); // boolean | undefined
  console.log(config.security?.concurrent?.maxSessions); // number | undefined
  console.log(config.security?.rotation?.onElevation); // boolean | undefined
}
