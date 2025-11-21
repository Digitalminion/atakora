/**
 * Field Types Usage Examples
 *
 * @remarks
 * This file demonstrates usage of all field types with examples.
 * Can be used as a reference or converted to tests.
 */

import { a, type InferFieldType, type InferFieldTypes } from './index';

// ============================================================================
// STRING FIELD EXAMPLES
// ============================================================================

/**
 * Basic string field
 */
const name = a.string().required();
type NameType = InferFieldType<typeof name>; // string

/**
 * Email validation
 */
const email = a.string().required().email();
type EmailType = InferFieldType<typeof email>; // string

/**
 * URL validation
 */
const website = a.string().url();
type WebsiteType = InferFieldType<typeof website>; // string

/**
 * Length constraints
 */
const username = a.string().min(3).max(20).required();
type UsernameType = InferFieldType<typeof username>; // string

/**
 * Pattern matching
 */
const zipCode = a.string().regex(/^\d{5}(-\d{4})?$/);
type ZipCodeType = InferFieldType<typeof zipCode>; // string

/**
 * UUID validation
 */
const correlationId = a.string().uuid();
type CorrelationIdType = InferFieldType<typeof correlationId>; // string

/**
 * Phone validation
 */
const phone = a.string().phone();
type PhoneType = InferFieldType<typeof phone>; // string

// ============================================================================
// NUMBER FIELD EXAMPLES
// ============================================================================

/**
 * Basic number field
 */
const count = a.number().required();
type CountType = InferFieldType<typeof count>; // number

/**
 * Age with constraints
 */
const age = a.number().min(0).max(120);
type AgeType = InferFieldType<typeof age>; // number

/**
 * Integer only
 */
const quantity = a.number().integer().positive();
type QuantityType = InferFieldType<typeof quantity>; // number

/**
 * Price (positive decimal)
 */
const price = a.number().positive().min(0.01);
type PriceType = InferFieldType<typeof price>; // number

/**
 * Percentage
 */
const percentage = a.number().min(0).max(100);
type PercentageType = InferFieldType<typeof percentage>; // number

// ============================================================================
// BOOLEAN FIELD EXAMPLES
// ============================================================================

/**
 * Basic boolean with default
 */
const isActive = a.boolean().default(true);
type IsActiveType = InferFieldType<typeof isActive>; // boolean

/**
 * Required boolean
 */
const agreedToTerms = a.boolean().required();
type AgreedToTermsType = InferFieldType<typeof agreedToTerms>; // boolean

/**
 * Optional boolean
 */
const receiveNewsletter = a.boolean().optional();
type ReceiveNewsletterType = InferFieldType<typeof receiveNewsletter>; // boolean

// ============================================================================
// DATETIME FIELD EXAMPLES
// ============================================================================

/**
 * Basic datetime
 */
const createdAt = a.datetime().required();
type CreatedAtType = InferFieldType<typeof createdAt>; // string (ISO 8601)

/**
 * Future date only
 */
const scheduledFor = a.datetime().future();
type ScheduledForType = InferFieldType<typeof scheduledFor>; // string

/**
 * Past date only
 */
const birthDate = a.datetime().past();
type BirthDateType = InferFieldType<typeof birthDate>; // string

/**
 * Date range
 */
const eventDate = a.datetime()
  .min(new Date('2024-01-01'))
  .max(new Date('2024-12-31'));
type EventDateType = InferFieldType<typeof eventDate>; // string

/**
 * Nullable datetime
 */
const deletedAt = a.datetime().nullable();
type DeletedAtType = InferFieldType<typeof deletedAt>; // string

// ============================================================================
// ID FIELD EXAMPLES
// ============================================================================

/**
 * Basic ID (auto-generated)
 */
const id = a.id();
type IdType = InferFieldType<typeof id>; // string

/**
 * ID with prefix
 */
const userId = a.id().prefix('user');
type UserIdType = InferFieldType<typeof userId>; // string

/**
 * Manual ID (not auto-generated)
 */
const externalId = a.id().manual().required();
type ExternalIdType = InferFieldType<typeof externalId>; // string

// ============================================================================
// ENUM FIELD EXAMPLES
// ============================================================================

/**
 * Status enum
 */
const status = a.enum(['pending', 'active', 'archived']);
type StatusType = InferFieldType<typeof status>; // 'pending' | 'active' | 'archived'

/**
 * Role enum with default
 */
const role = a.enum(['user', 'admin', 'analyst']).default('user');
type RoleType = InferFieldType<typeof role>; // 'user' | 'admin' | 'analyst'

/**
 * Priority enum
 */
const priority = a.enum(['low', 'medium', 'high', 'critical']).required();
type PriorityType = InferFieldType<typeof priority>; // 'low' | 'medium' | 'high' | 'critical'

// ============================================================================
// ARRAY FIELD EXAMPLES
// ============================================================================

/**
 * Array of strings
 */
const tags = a.array(a.string()).default([]);
type TagsType = InferFieldType<typeof tags>; // string[]

/**
 * Array with constraints
 */
const emails = a.array(a.string().email()).minItems(1).maxItems(5);
type EmailsType = InferFieldType<typeof emails>; // string[]

/**
 * Array with unique items
 */
const userIds = a.array(a.string()).unique();
type UserIdsType = InferFieldType<typeof userIds>; // string[]

/**
 * Array of numbers
 */
const scores = a.array(a.number().min(0).max(100));
type ScoresType = InferFieldType<typeof scores>; // number[]

// ============================================================================
// REFERENCE FIELD EXAMPLES
// ============================================================================

/**
 * Basic reference
 */
const projectId = a.ref('Project').required();
type ProjectIdType = InferFieldType<typeof projectId>; // string

/**
 * Reference with cascade delete
 */
const ownerId = a.ref('User').onDelete('cascade');
type OwnerIdType = InferFieldType<typeof ownerId>; // string

/**
 * Optional reference
 */
const parentId = a.ref('Category').optional();
type ParentIdType = InferFieldType<typeof parentId>; // string

// ============================================================================
// OBJECT FIELD EXAMPLES
// ============================================================================

/**
 * Address object
 */
const address = a.object({
  street: a.string().required(),
  city: a.string().required(),
  state: a.string().required(),
  zip: a.string().required(),
});
type AddressType = InferFieldType<typeof address>;
// { street: string; city: string; state: string; zip: string; }

/**
 * Nested settings object
 */
const settings = a.object({
  theme: a.enum(['light', 'dark']).default('light'),
  notifications: a.object({
    email: a.boolean().default(true),
    sms: a.boolean().default(false),
  }),
}).default({});
type SettingsType = InferFieldType<typeof settings>;
// { theme: 'light' | 'dark'; notifications: { email: boolean; sms: boolean; } }

// ============================================================================
// JSON FIELD EXAMPLES
// ============================================================================

/**
 * Dynamic metadata
 */
const metadata = a.json().default({});
type MetadataType = InferFieldType<typeof metadata>; // any

/**
 * Optional JSON
 */
const preferences = a.json().optional();
type PreferencesType = InferFieldType<typeof preferences>; // any

/**
 * Object-only JSON
 */
const config = a.json().objectOnly();
type ConfigType = InferFieldType<typeof config>; // any

// ============================================================================
// BINARY FIELD EXAMPLES
// ============================================================================

/**
 * Basic binary field
 */
const file = a.binary().required();
type FileType = InferFieldType<typeof file>; // Buffer | Uint8Array

/**
 * Image with size limit
 */
const image = a.binary()
  .maxSize(10 * 1024 * 1024) // 10MB
  .mimeTypes(['image/png', 'image/jpeg', 'image/gif']);
type ImageType = InferFieldType<typeof image>; // Buffer | Uint8Array

/**
 * PDF only
 */
const document = a.binary()
  .mimeTypes(['application/pdf'])
  .maxSize(5 * 1024 * 1024); // 5MB
type DocumentType = InferFieldType<typeof document>; // Buffer | Uint8Array

// ============================================================================
// COMPLEX SCHEMA EXAMPLE
// ============================================================================

/**
 * Complete user model example
 */
const userModel = {
  // Identity
  id: a.id(),
  email: a.string().required().email(),
  username: a.string().required().min(3).max(20),

  // Profile
  firstName: a.string().required(),
  lastName: a.string().required(),
  displayName: a.string(),
  bio: a.string().max(500),
  avatar: a.string().url(),

  // Contact
  phone: a.string().phone(),
  address: a.object({
    street: a.string(),
    city: a.string(),
    state: a.string(),
    zip: a.string(),
  }),

  // Status
  role: a.enum(['user', 'admin', 'analyst']).default('user'),
  status: a.enum(['active', 'suspended', 'deleted']).default('active'),
  isEmailVerified: a.boolean().default(false),
  isActive: a.boolean().default(true),

  // Settings
  preferences: a.object({
    theme: a.enum(['light', 'dark', 'auto']).default('auto'),
    language: a.string().default('en'),
    timezone: a.string().default('UTC'),
    notifications: a.object({
      email: a.boolean().default(true),
      sms: a.boolean().default(false),
      push: a.boolean().default(true),
    }),
  }).default({}),

  // Metadata
  tags: a.array(a.string()).default([]),
  metadata: a.json().default({}),

  // Relationships
  organizationId: a.ref('Organization').required(),
  managerId: a.ref('User').optional(),

  // Timestamps
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  lastLoginAt: a.datetime(),
  deletedAt: a.datetime().nullable(),
};

type User = InferFieldTypes<typeof userModel>;
/*
Type User = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  avatar: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  role: 'user' | 'admin' | 'analyst';
  status: 'active' | 'suspended' | 'deleted';
  isEmailVerified: boolean;
  isActive: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  tags: string[];
  metadata: any;
  organizationId: string;
  managerId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  deletedAt: string;
}
*/

// ============================================================================
// EXPORT EXAMPLES FOR TESTING
// ============================================================================

export const examples = {
  string: { name, email, website, username, zipCode, correlationId, phone },
  number: { count, age, quantity, price, percentage },
  boolean: { isActive, agreedToTerms, receiveNewsletter },
  datetime: { createdAt, scheduledFor, birthDate, eventDate, deletedAt },
  id: { id, userId, externalId },
  enum: { status, role, priority },
  array: { tags, emails, userIds, scores },
  ref: { projectId, ownerId, parentId },
  object: { address, settings },
  json: { metadata, preferences, config },
  binary: { file, image, document },
  complex: { userModel },
};

// Type exports for testing type inference
export type Examples = {
  string: {
    name: NameType;
    email: EmailType;
    website: WebsiteType;
    username: UsernameType;
    zipCode: ZipCodeType;
    correlationId: CorrelationIdType;
    phone: PhoneType;
  };
  number: {
    count: CountType;
    age: AgeType;
    quantity: QuantityType;
    price: PriceType;
    percentage: PercentageType;
  };
  boolean: {
    isActive: IsActiveType;
    agreedToTerms: AgreedToTermsType;
    receiveNewsletter: ReceiveNewsletterType;
  };
  datetime: {
    createdAt: CreatedAtType;
    scheduledFor: ScheduledForType;
    birthDate: BirthDateType;
    eventDate: EventDateType;
    deletedAt: DeletedAtType;
  };
  id: {
    id: IdType;
    userId: UserIdType;
    externalId: ExternalIdType;
  };
  enum: {
    status: StatusType;
    role: RoleType;
    priority: PriorityType;
  };
  array: {
    tags: TagsType;
    emails: EmailsType;
    userIds: UserIdsType;
    scores: ScoresType;
  };
  ref: {
    projectId: ProjectIdType;
    ownerId: OwnerIdType;
    parentId: ParentIdType;
  };
  object: {
    address: AddressType;
    settings: SettingsType;
  };
  json: {
    metadata: MetadataType;
    preferences: PreferencesType;
    config: ConfigType;
  };
  binary: {
    file: FileType;
    image: ImageType;
    document: DocumentType;
  };
  complex: {
    user: User;
  };
};
