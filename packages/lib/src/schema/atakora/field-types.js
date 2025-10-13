"use strict";
/**
 * Field type definitions with Zod extensions.
 *
 * @remarks
 * Extended Zod schemas with additional metadata for database mapping,
 * validation, and UI generation.
 *
 * @packageDocumentation
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fields = exports.FieldBuilder = void 0;
exports.field = field;
exports.getFieldMetadata = getFieldMetadata;
exports.hasFieldMetadata = hasFieldMetadata;
var zod_1 = require("zod");
/**
 * Field type builder with chainable metadata methods.
 */
var FieldBuilder = /** @class */ (function () {
    function FieldBuilder(schema, metadata) {
        if (metadata === void 0) { metadata = {}; }
        this.schema = schema;
        this.metadata = metadata;
    }
    /**
     * Mark as primary key.
     */
    FieldBuilder.prototype.primaryKey = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { primaryKey: true, unique: true }));
    };
    /**
     * Mark as unique.
     */
    FieldBuilder.prototype.unique = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { unique: true }));
    };
    /**
     * Mark as indexed.
     */
    FieldBuilder.prototype.indexed = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { indexed: true }));
    };
    /**
     * Auto-generate UUID on create.
     */
    FieldBuilder.prototype.autoUuid = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { autoGenerate: 'uuid' }));
    };
    /**
     * Auto-generate CUID on create.
     */
    FieldBuilder.prototype.autoCuid = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { autoGenerate: 'cuid' }));
    };
    /**
     * Auto-increment on create.
     */
    FieldBuilder.prototype.autoIncrement = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { autoGenerate: 'increment' }));
    };
    /**
     * Auto-set timestamp on create.
     */
    FieldBuilder.prototype.createdAt = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { autoGenerate: 'timestamp' }));
    };
    /**
     * Auto-update timestamp on modification.
     */
    FieldBuilder.prototype.updatedAt = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { autoUpdate: 'timestamp' }));
    };
    /**
     * Set database column name.
     */
    FieldBuilder.prototype.columnName = function (name) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { columnName: name }));
    };
    /**
     * Set UI label.
     */
    FieldBuilder.prototype.label = function (label) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { label: label }));
    };
    /**
     * Set UI placeholder.
     */
    FieldBuilder.prototype.placeholder = function (placeholder) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { placeholder: placeholder }));
    };
    /**
     * Set UI help text.
     */
    FieldBuilder.prototype.helpText = function (helpText) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { helpText: helpText }));
    };
    /**
     * Hide field in UI.
     */
    FieldBuilder.prototype.hidden = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { hidden: true }));
    };
    /**
     * Make field readonly in UI.
     */
    FieldBuilder.prototype.readonly = function () {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { readonly: true }));
    };
    /**
     * Set field group for UI organization.
     */
    FieldBuilder.prototype.group = function (group) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { group: group }));
    };
    /**
     * Set sort order for UI.
     */
    FieldBuilder.prototype.sortOrder = function (order) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { sortOrder: order }));
    };
    /**
     * Set custom validation messages.
     */
    FieldBuilder.prototype.messages = function (messages) {
        return new FieldBuilder(this.schema, __assign(__assign({}, this.metadata), { messages: __assign(__assign({}, this.metadata.messages), messages) }));
    };
    /**
     * Build the final schema with metadata.
     */
    FieldBuilder.prototype.build = function () {
        var extended = this.schema;
        extended._metadata = this.metadata;
        return extended;
    };
    return FieldBuilder;
}());
exports.FieldBuilder = FieldBuilder;
/**
 * Create a field builder from a Zod schema.
 */
function field(schema) {
    return new FieldBuilder(schema);
}
/**
 * Common field types with convenience builders.
 */
exports.Fields = {
    /**
     * String field.
     */
    string: function () { return field(zod_1.z.string()); },
    /**
     * Number field.
     */
    number: function () { return field(zod_1.z.number()); },
    /**
     * Integer field.
     */
    int: function () { return field(zod_1.z.number().int()); },
    /**
     * Boolean field.
     */
    boolean: function () { return field(zod_1.z.boolean()); },
    /**
     * Date field.
     */
    date: function () { return field(zod_1.z.date()); },
    /**
     * UUID field.
     */
    uuid: function () { return field(zod_1.z.string().uuid()); },
    /**
     * Email field.
     */
    email: function () { return field(zod_1.z.string().email()); },
    /**
     * URL field.
     */
    url: function () { return field(zod_1.z.string().url()); },
    /**
     * Enum field.
     */
    enum: function (values) {
        return field(zod_1.z.enum(values));
    },
    /**
     * Array field.
     */
    array: function (itemSchema) {
        return field(zod_1.z.array(itemSchema));
    },
    /**
     * Object field.
     */
    object: function (shape) {
        return field(zod_1.z.object(shape));
    },
    /**
     * JSON field (stored as string, parsed as object).
     */
    json: function () { return field(zod_1.z.string().transform(function (str) { return JSON.parse(str); })); },
    /**
     * Primary key ID field (auto-generated UUID).
     */
    id: function () {
        return field(zod_1.z.string().uuid())
            .primaryKey()
            .autoUuid()
            .readonly()
            .build();
    },
    /**
     * Created timestamp field (auto-generated).
     */
    createdAt: function () {
        return field(zod_1.z.date())
            .createdAt()
            .readonly()
            .build();
    },
    /**
     * Updated timestamp field (auto-updated).
     */
    updatedAt: function () {
        return field(zod_1.z.date())
            .updatedAt()
            .readonly()
            .build();
    },
    /**
     * Slug field (URL-friendly string).
     */
    slug: function () {
        return field(zod_1.z.string().regex(/^[a-z0-9-]+$/))
            .unique()
            .indexed()
            .build();
    },
    /**
     * Text field (long text content).
     */
    text: function () { return field(zod_1.z.string()); },
    /**
     * Rich text field (HTML or markdown).
     */
    richText: function () { return field(zod_1.z.string()); },
    /**
     * Password field (hashed).
     */
    password: function () {
        return field(zod_1.z.string().min(8))
            .hidden()
            .build();
    },
    /**
     * Phone number field.
     */
    phone: function () {
        return field(zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/));
    },
    /**
     * Currency amount field (in cents).
     */
    currency: function () { return field(zod_1.z.number().int().nonnegative()); },
    /**
     * Percentage field (0-100).
     */
    percentage: function () { return field(zod_1.z.number().min(0).max(100)); },
    /**
     * IP address field.
     */
    ip: function () {
        return field(zod_1.z.string().ip());
    },
    /**
     * Country code field (ISO 3166-1 alpha-2).
     */
    countryCode: function () {
        return field(zod_1.z.string().length(2).toUpperCase());
    },
    /**
     * Latitude coordinate.
     */
    latitude: function () { return field(zod_1.z.number().min(-90).max(90)); },
    /**
     * Longitude coordinate.
     */
    longitude: function () { return field(zod_1.z.number().min(-180).max(180)); },
    /**
     * Geo-coordinates field.
     */
    coordinates: function () {
        return field(zod_1.z.object({
            lat: zod_1.z.number().min(-90).max(90),
            lng: zod_1.z.number().min(-180).max(180),
        }));
    },
    /**
     * Color field (hex color code).
     */
    color: function () {
        return field(zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/));
    },
    /**
     * File reference field.
     */
    file: function () {
        return field(zod_1.z.object({
            url: zod_1.z.string().url(),
            name: zod_1.z.string(),
            size: zod_1.z.number().int().nonnegative(),
            mimeType: zod_1.z.string(),
        }));
    },
    /**
     * Image reference field.
     */
    image: function () {
        return field(zod_1.z.object({
            url: zod_1.z.string().url(),
            alt: zod_1.z.string().optional(),
            width: zod_1.z.number().int().positive().optional(),
            height: zod_1.z.number().int().positive().optional(),
        })).build();
    },
    /**
     * Tags field (array of strings).
     */
    tags: function () {
        return field(zod_1.z.array(zod_1.z.string()))
            .build();
    },
    /**
     * Metadata field (arbitrary JSON object).
     */
    metadata: function () {
        return field(zod_1.z.record(zod_1.z.any()))
            .build();
    },
};
/**
 * Extract field metadata from an extended Zod schema.
 */
function getFieldMetadata(schema) {
    return schema._metadata;
}
/**
 * Check if a schema has field metadata.
 */
function hasFieldMetadata(schema) {
    return '_metadata' in schema && schema._metadata !== undefined;
}
