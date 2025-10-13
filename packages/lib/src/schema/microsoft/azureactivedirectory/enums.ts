/**
 * Enums for Azure Active Directory B2C/CIAM (Microsoft.AzureActiveDirectory).
 *
 * @remarks
 * Curated enums for Azure AD B2C and CIAM directory resources.
 *
 * **Resource Types**:
 * - Microsoft.AzureActiveDirectory/b2cDirectories
 * - Microsoft.AzureActiveDirectory/ciamDirectories
 * - Microsoft.AzureActiveDirectory/guestUsages
 *
 * **API Versions**: 2023-05-17-preview, 2021-04-01
 *
 * @packageDocumentation
 */

// B2C Directory enums

/**
 * Azure AD B2C directory location/region.
 *
 * @remarks
 * Specifies the data residency location for the B2C tenant.
 *
 * @see {@link https://aka.ms/B2CDataResidency | B2C Data Residency}
 */
export enum B2CDirectoryLocation {
  /**
   * United States data residency.
   */
  UNITED_STATES = 'United States',

  /**
   * Europe data residency.
   */
  EUROPE = 'Europe',

  /**
   * Asia Pacific data residency.
   */
  ASIA_PACIFIC = 'Asia Pacific',

  /**
   * Australia data residency.
   */
  AUSTRALIA = 'Australia',
}

/**
 * Azure AD B2C SKU name.
 */
export enum B2CSkuName {
  /**
   * Standard SKU.
   */
  STANDARD = 'Standard',

  /**
   * Premium P1 SKU.
   */
  PREMIUM_P1 = 'PremiumP1',

  /**
   * Premium P2 SKU.
   */
  PREMIUM_P2 = 'PremiumP2',
}

/**
 * Azure AD B2C SKU tier.
 *
 * @remarks
 * Currently only A0 tier is available.
 */
export enum B2CSkuTier {
  /**
   * A0 tier.
   */
  A0 = 'A0',
}
