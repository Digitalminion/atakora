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
export declare class FieldBuilder<T extends z.ZodTypeAny> {
    private schema;
    private metadata;
    constructor(schema: T, metadata?: FieldMetadata);
    /**
     * Mark as primary key.
     */
    primaryKey(): FieldBuilder<T>;
    /**
     * Mark as unique.
     */
    unique(): FieldBuilder<T>;
    /**
     * Mark as indexed.
     */
    indexed(): FieldBuilder<T>;
    /**
     * Auto-generate UUID on create.
     */
    autoUuid(): FieldBuilder<T>;
    /**
     * Auto-generate CUID on create.
     */
    autoCuid(): FieldBuilder<T>;
    /**
     * Auto-increment on create.
     */
    autoIncrement(): FieldBuilder<T>;
    /**
     * Auto-set timestamp on create.
     */
    createdAt(): FieldBuilder<T>;
    /**
     * Auto-update timestamp on modification.
     */
    updatedAt(): FieldBuilder<T>;
    /**
     * Set database column name.
     */
    columnName(name: string): FieldBuilder<T>;
    /**
     * Set UI label.
     */
    label(label: string): FieldBuilder<T>;
    /**
     * Set UI placeholder.
     */
    placeholder(placeholder: string): FieldBuilder<T>;
    /**
     * Set UI help text.
     */
    helpText(helpText: string): FieldBuilder<T>;
    /**
     * Hide field in UI.
     */
    hidden(): FieldBuilder<T>;
    /**
     * Make field readonly in UI.
     */
    readonly(): FieldBuilder<T>;
    /**
     * Set field group for UI organization.
     */
    group(group: string): FieldBuilder<T>;
    /**
     * Set sort order for UI.
     */
    sortOrder(order: number): FieldBuilder<T>;
    /**
     * Set custom validation messages.
     */
    messages(messages: FieldMetadata['messages']): FieldBuilder<T>;
    /**
     * Build the final schema with metadata.
     */
    build(): ExtendedZodSchema<T>;
}
/**
 * Create a field builder from a Zod schema.
 */
export declare function field<T extends z.ZodTypeAny>(schema: T): FieldBuilder<T>;
/**
 * Common field types with convenience builders.
 */
export declare const Fields: {
    /**
     * String field.
     */
    string: () => FieldBuilder<z.ZodString>;
    /**
     * Number field.
     */
    number: () => FieldBuilder<z.ZodNumber>;
    /**
     * Integer field.
     */
    int: () => FieldBuilder<z.ZodNumber>;
    /**
     * Boolean field.
     */
    boolean: () => FieldBuilder<z.ZodBoolean>;
    /**
     * Date field.
     */
    date: () => FieldBuilder<z.ZodDate>;
    /**
     * UUID field.
     */
    uuid: () => FieldBuilder<z.ZodString>;
    /**
     * Email field.
     */
    email: () => FieldBuilder<z.ZodString>;
    /**
     * URL field.
     */
    url: () => FieldBuilder<z.ZodString>;
    /**
     * Enum field.
     */
    enum: <T extends [string, ...string[]]>(values: T) => FieldBuilder<z.ZodEnum<z.Writeable<T>>>;
    /**
     * Array field.
     */
    array: <T extends z.ZodTypeAny>(itemSchema: T) => FieldBuilder<z.ZodArray<T, "many">>;
    /**
     * Object field.
     */
    object: <T extends z.ZodRawShape>(shape: T) => FieldBuilder<z.ZodObject<T, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<T> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>>;
    /**
     * JSON field (stored as string, parsed as object).
     */
    json: <T = any>() => FieldBuilder<z.ZodEffects<z.ZodString, T, string>>;
    /**
     * Primary key ID field (auto-generated UUID).
     */
    id: () => ExtendedZodSchema<z.ZodString>;
    /**
     * Created timestamp field (auto-generated).
     */
    createdAt: () => ExtendedZodSchema<z.ZodDate>;
    /**
     * Updated timestamp field (auto-updated).
     */
    updatedAt: () => ExtendedZodSchema<z.ZodDate>;
    /**
     * Slug field (URL-friendly string).
     */
    slug: () => ExtendedZodSchema<z.ZodString>;
    /**
     * Text field (long text content).
     */
    text: () => FieldBuilder<z.ZodString>;
    /**
     * Rich text field (HTML or markdown).
     */
    richText: () => FieldBuilder<z.ZodString>;
    /**
     * Password field (hashed).
     */
    password: () => ExtendedZodSchema<z.ZodString>;
    /**
     * Phone number field.
     */
    phone: () => FieldBuilder<z.ZodString>;
    /**
     * Currency amount field (in cents).
     */
    currency: () => FieldBuilder<z.ZodNumber>;
    /**
     * Percentage field (0-100).
     */
    percentage: () => FieldBuilder<z.ZodNumber>;
    /**
     * IP address field.
     */
    ip: () => FieldBuilder<z.ZodString>;
    /**
     * Country code field (ISO 3166-1 alpha-2).
     */
    countryCode: () => FieldBuilder<z.ZodString>;
    /**
     * Latitude coordinate.
     */
    latitude: () => FieldBuilder<z.ZodNumber>;
    /**
     * Longitude coordinate.
     */
    longitude: () => FieldBuilder<z.ZodNumber>;
    /**
     * Geo-coordinates field.
     */
    coordinates: () => FieldBuilder<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat?: number;
        lng?: number;
    }, {
        lat?: number;
        lng?: number;
    }>>;
    /**
     * Color field (hex color code).
     */
    color: () => FieldBuilder<z.ZodString>;
    /**
     * File reference field.
     */
    file: () => FieldBuilder<z.ZodObject<{
        url: z.ZodString;
        name: z.ZodString;
        size: z.ZodNumber;
        mimeType: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        url?: string;
        size?: number;
        mimeType?: string;
    }, {
        name?: string;
        url?: string;
        size?: number;
        mimeType?: string;
    }>>;
    /**
     * Image reference field.
     */
    image: () => ExtendedZodSchema<z.ZodObject<{
        url: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url?: string;
        alt?: string;
        width?: number;
        height?: number;
    }, {
        url?: string;
        alt?: string;
        width?: number;
        height?: number;
    }>>;
    /**
     * Tags field (array of strings).
     */
    tags: () => ExtendedZodSchema<z.ZodArray<z.ZodString, "many">>;
    /**
     * Metadata field (arbitrary JSON object).
     */
    metadata: () => ExtendedZodSchema<z.ZodRecord<z.ZodString, z.ZodAny>>;
};
/**
 * Extract field metadata from an extended Zod schema.
 */
export declare function getFieldMetadata<T extends z.ZodTypeAny>(schema: ExtendedZodSchema<T>): FieldMetadata | undefined;
/**
 * Check if a schema has field metadata.
 */
export declare function hasFieldMetadata<T extends z.ZodTypeAny>(schema: T): schema is ExtendedZodSchema<T>;
//# sourceMappingURL=field-types.d.ts.map