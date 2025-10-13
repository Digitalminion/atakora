/**
 * Field type definitions with Zod extensions.
 *
 * @remarks
 * Extended Zod schemas with additional metadata for database mapping,
 * validation, and UI generation.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * Field metadata interface.
 */
export interface FieldMetadata {
  /**
   * Mark field as primary key.
   */
  primaryKey?: boolean;

  /**
   * Mark field as unique.
   */
  unique?: boolean;

  /**
   * Mark field as indexed.
   */
  indexed?: boolean;

  /**
   * Auto-generate value on create.
   */
  autoGenerate?: 'uuid' | 'cuid' | 'increment' | 'timestamp';

  /**
   * Auto-update value on modification.
   */
  autoUpdate?: 'timestamp';

  /**
   * Database column name (if different from field name).
   */
  columnName?: string;

  /**
   * UI display label.
   */
  label?: string;

  /**
   * UI placeholder text.
   */
  placeholder?: string;

  /**
   * UI help text.
   */
  helpText?: string;

  /**
   * Hide field in UI.
   */
  hidden?: boolean;

  /**
   * Make field readonly in UI.
   */
  readonly?: boolean;

  /**
   * Field group for UI organization.
   */
  group?: string;

  /**
   * Sort order for UI.
   */
  sortOrder?: number;

  /**
   * Custom validation error messages.
   */
  messages?: {
    required?: string;
    invalid?: string;
    min?: string;
    max?: string;
  };
}

/**
 * Extended Zod schema with field metadata.
 */
export type ExtendedZodSchema<T extends z.ZodTypeAny = z.ZodTypeAny> = T & {
  _metadata?: FieldMetadata;
};

/**
 * Field type builder with chainable metadata methods.
 */
export class FieldBuilder<T extends z.ZodTypeAny> {
  constructor(
    private schema: T,
    private metadata: FieldMetadata = {}
  ) {}

  /**
   * Mark as primary key.
   */
  primaryKey(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      primaryKey: true,
      unique: true,
    });
  }

  /**
   * Mark as unique.
   */
  unique(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      unique: true,
    });
  }

  /**
   * Mark as indexed.
   */
  indexed(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      indexed: true,
    });
  }

  /**
   * Auto-generate UUID on create.
   */
  autoUuid(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      autoGenerate: 'uuid',
    });
  }

  /**
   * Auto-generate CUID on create.
   */
  autoCuid(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      autoGenerate: 'cuid',
    });
  }

  /**
   * Auto-increment on create.
   */
  autoIncrement(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      autoGenerate: 'increment',
    });
  }

  /**
   * Auto-set timestamp on create.
   */
  createdAt(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      autoGenerate: 'timestamp',
    });
  }

  /**
   * Auto-update timestamp on modification.
   */
  updatedAt(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      autoUpdate: 'timestamp',
    });
  }

  /**
   * Set database column name.
   */
  columnName(name: string): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      columnName: name,
    });
  }

  /**
   * Set UI label.
   */
  label(label: string): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      label,
    });
  }

  /**
   * Set UI placeholder.
   */
  placeholder(placeholder: string): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      placeholder,
    });
  }

  /**
   * Set UI help text.
   */
  helpText(helpText: string): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      helpText,
    });
  }

  /**
   * Hide field in UI.
   */
  hidden(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      hidden: true,
    });
  }

  /**
   * Make field readonly in UI.
   */
  readonly(): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      readonly: true,
    });
  }

  /**
   * Set field group for UI organization.
   */
  group(group: string): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      group,
    });
  }

  /**
   * Set sort order for UI.
   */
  sortOrder(order: number): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      sortOrder: order,
    });
  }

  /**
   * Set custom validation messages.
   */
  messages(messages: FieldMetadata['messages']): FieldBuilder<T> {
    return new FieldBuilder(this.schema, {
      ...this.metadata,
      messages: { ...this.metadata.messages, ...messages },
    });
  }

  /**
   * Build the final schema with metadata.
   */
  build(): ExtendedZodSchema<T> {
    const extended = this.schema as ExtendedZodSchema<T>;
    extended._metadata = this.metadata;
    return extended;
  }
}

/**
 * Create a field builder from a Zod schema.
 */
export function field<T extends z.ZodTypeAny>(schema: T): FieldBuilder<T> {
  return new FieldBuilder(schema);
}

/**
 * Common field types with convenience builders.
 */
export const Fields = {
  /**
   * String field.
   */
  string: () => field(z.string()),

  /**
   * Number field.
   */
  number: () => field(z.number()),

  /**
   * Integer field.
   */
  int: () => field(z.number().int()),

  /**
   * Boolean field.
   */
  boolean: () => field(z.boolean()),

  /**
   * Date field.
   */
  date: () => field(z.date()),

  /**
   * UUID field.
   */
  uuid: () => field(z.string().uuid()),

  /**
   * Email field.
   */
  email: () => field(z.string().email()),

  /**
   * URL field.
   */
  url: () => field(z.string().url()),

  /**
   * Enum field.
   */
  enum: <T extends [string, ...string[]]>(values: T) =>
    field(z.enum(values)),

  /**
   * Array field.
   */
  array: <T extends z.ZodTypeAny>(itemSchema: T) =>
    field(z.array(itemSchema)),

  /**
   * Object field.
   */
  object: <T extends z.ZodRawShape>(shape: T) =>
    field(z.object(shape)),

  /**
   * JSON field (stored as string, parsed as object).
   */
  json: <T = any>() => field(z.string().transform((str) => JSON.parse(str) as T)),

  /**
   * Primary key ID field (auto-generated UUID).
   */
  id: () =>
    field(z.string().uuid())
      .primaryKey()
      .autoUuid()
      .readonly()
      .build(),

  /**
   * Created timestamp field (auto-generated).
   */
  createdAt: () =>
    field(z.date())
      .createdAt()
      .readonly()
      .build(),

  /**
   * Updated timestamp field (auto-updated).
   */
  updatedAt: () =>
    field(z.date())
      .updatedAt()
      .readonly()
      .build(),

  /**
   * Slug field (URL-friendly string).
   */
  slug: () =>
    field(z.string().regex(/^[a-z0-9-]+$/))
      .unique()
      .indexed()
      .build(),

  /**
   * Text field (long text content).
   */
  text: () => field(z.string()),

  /**
   * Rich text field (HTML or markdown).
   */
  richText: () => field(z.string()),

  /**
   * Password field (hashed).
   */
  password: () =>
    field(z.string().min(8))
      .hidden()
      .build(),

  /**
   * Phone number field.
   */
  phone: () =>
    field(z.string().regex(/^\+?[1-9]\d{1,14}$/)),

  /**
   * Currency amount field (in cents).
   */
  currency: () => field(z.number().int().nonnegative()),

  /**
   * Percentage field (0-100).
   */
  percentage: () => field(z.number().min(0).max(100)),

  /**
   * IP address field.
   */
  ip: () =>
    field(z.string().ip()),

  /**
   * Country code field (ISO 3166-1 alpha-2).
   */
  countryCode: () =>
    field(z.string().length(2).toUpperCase()),

  /**
   * Latitude coordinate.
   */
  latitude: () => field(z.number().min(-90).max(90)),

  /**
   * Longitude coordinate.
   */
  longitude: () => field(z.number().min(-180).max(180)),

  /**
   * Geo-coordinates field.
   */
  coordinates: () =>
    field(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
    ),

  /**
   * Color field (hex color code).
   */
  color: () =>
    field(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),

  /**
   * File reference field.
   */
  file: () =>
    field(
      z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number().int().nonnegative(),
        mimeType: z.string(),
      })
    ),

  /**
   * Image reference field.
   */
  image: () =>
    field(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    ).build(),

  /**
   * Tags field (array of strings).
   */
  tags: () =>
    field(z.array(z.string()))
      .build(),

  /**
   * Metadata field (arbitrary JSON object).
   */
  metadata: () =>
    field(z.record(z.any()))
      .build(),
};

/**
 * Extract field metadata from an extended Zod schema.
 */
export function getFieldMetadata<T extends z.ZodTypeAny>(
  schema: ExtendedZodSchema<T>
): FieldMetadata | undefined {
  return schema._metadata;
}

/**
 * Check if a schema has field metadata.
 */
export function hasFieldMetadata<T extends z.ZodTypeAny>(
  schema: T
): schema is ExtendedZodSchema<T> {
  return '_metadata' in schema && schema._metadata !== undefined;
}
