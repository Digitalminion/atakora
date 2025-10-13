"use strict";
/**
 * ARM Schema Parser - Parses Azure ARM JSON schemas into intermediate representation.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaParser = void 0;
var fs = require("fs");
/**
 * Parses ARM JSON schemas into intermediate representation.
 *
 * @remarks
 * Handles schema references, type resolution, and constraint extraction.
 * Caches loaded schemas for performance.
 *
 * @example
 * ```typescript
 * const parser = new SchemaParser();
 * const ir = parser.parse('../azure-resource-manager-schemas-main/schemas/2024-07-01/Microsoft.Network.NRP.json');
 *
 * console.log(`Provider: ${ir.provider}`);
 * console.log(`Resources: ${ir.resources.length}`);
 * ```
 */
var SchemaParser = /** @class */ (function () {
    function SchemaParser() {
        this.schemaCache = new Map();
    }
    /**
     * Parse an ARM schema file.
     *
     * @param schemaPath - Path to schema JSON file
     * @returns Schema intermediate representation
     *
     * @throws {Error} If schema file cannot be read or parsed
     */
    SchemaParser.prototype.parse = function (schemaPath) {
        var schemaJson = this.loadSchema(schemaPath);
        // Extract metadata
        var metadata = this.extractMetadata(schemaJson, schemaPath);
        // Parse resource definitions
        var resources = this.parseResourceDefinitions(schemaJson.resourceDefinitions || {}, schemaJson);
        // Parse shared definitions
        var definitions = this.parseDefinitions(schemaJson.definitions || {}, schemaJson);
        return {
            provider: metadata.provider,
            apiVersion: metadata.apiVersion,
            resources: resources,
            definitions: definitions,
            metadata: metadata,
        };
    };
    /**
     * Load schema JSON file with caching.
     *
     * @param schemaPath - Path to schema file
     * @returns Parsed JSON schema
     */
    SchemaParser.prototype.loadSchema = function (schemaPath) {
        if (this.schemaCache.has(schemaPath)) {
            return this.schemaCache.get(schemaPath);
        }
        var content = fs.readFileSync(schemaPath, 'utf-8');
        var schema = JSON.parse(content);
        this.schemaCache.set(schemaPath, schema);
        return schema;
    };
    /**
     * Extract schema metadata from schema ID and title.
     *
     * @param schema - Parsed schema JSON
     * @param schemaPath - File path
     * @returns Schema metadata
     */
    SchemaParser.prototype.extractMetadata = function (schema, schemaPath) {
        // Parse schema ID: "https://schema.management.azure.com/schemas/2024-07-01/Microsoft.Network.NRP.json#"
        var schemaId = schema.id || schema.$id || '';
        var match = schemaId.match(/schemas\/([^\/]+)\/([^\/]+)\.json/);
        return {
            schemaPath: schemaPath,
            provider: schema.title || 'Unknown',
            apiVersion: match ? match[1] : 'unknown',
            schemaId: schemaId,
            generatedAt: new Date().toISOString(),
        };
    };
    /**
     * Parse resource definitions section of schema.
     *
     * @param resourceDefs - Resource definitions object
     * @param schema - Full schema (for reference resolution)
     * @returns Array of resource definitions
     */
    SchemaParser.prototype.parseResourceDefinitions = function (resourceDefs, schema) {
        var resources = [];
        for (var _i = 0, _a = Object.entries(resourceDefs); _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], def = _b[1];
            var resource = this.parseResourceDefinition(name_1, def, schema);
            resources.push(resource);
        }
        return resources;
    };
    /**
     * Parse a single resource definition.
     *
     * @param name - Resource definition name
     * @param def - Resource definition object
     * @param schema - Full schema
     * @returns Resource definition
     */
    SchemaParser.prototype.parseResourceDefinition = function (name, def, schema) {
        var _a, _b, _c;
        // Extract ARM type from def.properties.type.enum[0]
        var armType = ((_c = (_b = (_a = def.properties) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.enum) === null || _c === void 0 ? void 0 : _c[0]) || name;
        // Parse properties
        var properties = this.parseProperties(def.properties || {}, schema);
        // Extract required fields
        var required = def.required || [];
        // Mark required properties
        for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
            var prop = properties_1[_i];
            if (required.includes(prop.name)) {
                prop.required = true;
            }
        }
        return {
            name: name,
            armType: armType,
            description: def.description,
            properties: properties,
            required: required,
        };
    };
    /**
     * Parse properties object into property definitions.
     *
     * @param props - Properties object from schema
     * @param schema - Full schema
     * @returns Array of property definitions
     */
    SchemaParser.prototype.parseProperties = function (props, schema) {
        var properties = [];
        for (var _i = 0, _a = Object.entries(props); _i < _a.length; _i++) {
            var _b = _a[_i], name_2 = _b[0], propDef = _b[1];
            // Skip ARM metadata properties
            if (['type', 'apiVersion'].includes(name_2)) {
                continue;
            }
            var property = this.parseProperty(name_2, propDef, schema);
            properties.push(property);
        }
        return properties;
    };
    /**
     * Parse a single property definition.
     *
     * @param name - Property name
     * @param propDef - Property definition from schema
     * @param schema - Full schema
     * @returns Property definition
     */
    SchemaParser.prototype.parseProperty = function (name, propDef, schema) {
        // Resolve type
        var type = this.parseType(propDef, schema);
        // Extract constraints
        var constraints = this.extractConstraints(propDef);
        return {
            name: name,
            type: type,
            description: propDef.description,
            required: false, // Set by parent resource definition
            constraints: constraints,
        };
    };
    /**
     * Parse type definition from schema property.
     *
     * @param typeDef - Type definition object
     * @param schema - Full schema
     * @returns Type definition
     */
    SchemaParser.prototype.parseType = function (typeDef, schema) {
        // Handle $ref
        if (typeDef.$ref) {
            return this.resolveReference(typeDef.$ref, schema);
        }
        // Handle oneOf (union type)
        if (typeDef.oneOf) {
            return this.parseUnionType(typeDef.oneOf, schema);
        }
        // Handle enum
        if (typeDef.enum) {
            return this.parseEnumType(typeDef);
        }
        // Handle primitive types
        var jsonType = typeDef.type;
        switch (jsonType) {
            case 'string':
                return { kind: 'primitive', tsType: 'string' };
            case 'integer':
            case 'number':
                return { kind: 'primitive', tsType: 'number' };
            case 'boolean':
                return { kind: 'primitive', tsType: 'boolean' };
            case 'object':
                return this.parseObjectType(typeDef, schema);
            case 'array':
                return this.parseArrayType(typeDef, schema);
            default:
                return { kind: 'primitive', tsType: 'any' };
        }
    };
    /**
     * Resolve $ref reference to type definition.
     *
     * @param ref - Reference string
     * @param schema - Full schema
     * @returns Type definition
     */
    SchemaParser.prototype.resolveReference = function (ref, schema) {
        // Internal ref: "#/definitions/SomeType"
        if (ref.startsWith('#/definitions/')) {
            var defName = ref.substring('#/definitions/'.length);
            if (schema.definitions && schema.definitions[defName]) {
                var def = schema.definitions[defName];
                // For simple object definitions, expand inline
                // For complex types, return reference
                if (def.type === 'object' && !def.properties) {
                    return this.parseType(def, schema);
                }
                // Return reference type (will be expanded later)
                return {
                    kind: 'reference',
                    tsType: this.toTypeName(defName),
                    refName: defName,
                };
            }
        }
        // External ref (common definitions): just reference by name
        if (ref.includes('common/definitions.json')) {
            var match = ref.match(/#\/definitions\/(\w+)/);
            if (match) {
                return {
                    kind: 'primitive',
                    tsType: 'any', // Fallback for common definitions
                };
            }
        }
        return { kind: 'primitive', tsType: 'any' };
    };
    /**
     * Parse union type (oneOf).
     *
     * @param oneOf - Array of type options
     * @param schema - Full schema
     * @returns Union type definition
     */
    SchemaParser.prototype.parseUnionType = function (oneOf, schema) {
        var _this = this;
        var unionTypes = oneOf.map(function (t) { return _this.parseType(t, schema); });
        // If one option is expression, just use the other type
        // (expressions are ARM template runtime values)
        var nonExprTypes = unionTypes.filter(function (t) { return !t.tsType.includes('expression'); });
        if (nonExprTypes.length === 1) {
            return nonExprTypes[0];
        }
        var tsType = unionTypes.map(function (t) { return t.tsType; }).join(' | ');
        return {
            kind: 'union',
            tsType: tsType,
            unionTypes: unionTypes,
        };
    };
    /**
     * Parse enum type.
     *
     * @param typeDef - Type definition with enum
     * @returns Enum type definition
     */
    SchemaParser.prototype.parseEnumType = function (typeDef) {
        var enumValues = typeDef.enum;
        // Generate union of string literals
        var tsType = enumValues
            .map(function (v) {
            if (typeof v === 'string') {
                return "'".concat(v, "'");
            }
            return v;
        })
            .join(' | ');
        return {
            kind: 'enum',
            tsType: tsType,
            enumValues: enumValues,
        };
    };
    /**
     * Parse object type.
     *
     * @param typeDef - Type definition for object
     * @param schema - Full schema
     * @returns Object type definition
     */
    SchemaParser.prototype.parseObjectType = function (typeDef, schema) {
        // Check for additionalProperties (Record type)
        if (typeDef.additionalProperties) {
            var valueType = this.parseType(typeDef.additionalProperties, schema);
            return {
                kind: 'object',
                tsType: "Record<string, ".concat(valueType.tsType, ">"),
            };
        }
        // Parse properties
        var properties = typeDef.properties ? this.parseProperties(typeDef.properties, schema) : [];
        return {
            kind: 'object',
            tsType: 'object', // Will be expanded to interface
            properties: properties,
        };
    };
    /**
     * Parse array type.
     *
     * @param typeDef - Type definition for array
     * @param schema - Full schema
     * @returns Array type definition
     */
    SchemaParser.prototype.parseArrayType = function (typeDef, schema) {
        var elementType = typeDef.items
            ? this.parseType(typeDef.items, schema)
            : { kind: 'primitive', tsType: 'any' };
        return {
            kind: 'array',
            tsType: "".concat(elementType.tsType, "[]"),
            elementType: elementType,
        };
    };
    /**
     * Extract property constraints for validation.
     *
     * @param propDef - Property definition
     * @returns Constraints object if any constraints exist
     */
    SchemaParser.prototype.extractConstraints = function (propDef) {
        // Build constraints object without readonly restriction
        var constraints = {};
        if (propDef.minLength !== undefined) {
            constraints.minLength = propDef.minLength;
        }
        if (propDef.maxLength !== undefined) {
            constraints.maxLength = propDef.maxLength;
        }
        if (propDef.minimum !== undefined) {
            constraints.minimum = propDef.minimum;
        }
        if (propDef.maximum !== undefined) {
            constraints.maximum = propDef.maximum;
        }
        if (propDef.pattern) {
            constraints.pattern = propDef.pattern;
        }
        if (propDef.enum) {
            constraints.enum = propDef.enum;
        }
        if (propDef.const !== undefined) {
            constraints.const = propDef.const;
        }
        return Object.keys(constraints).length > 0 ? constraints : undefined;
    };
    /**
     * Parse definitions section of schema.
     *
     * @param defs - Definitions object
     * @param schema - Full schema
     * @returns Map of definition name to type
     */
    SchemaParser.prototype.parseDefinitions = function (defs, schema) {
        var definitions = new Map();
        for (var _i = 0, _a = Object.entries(defs); _i < _a.length; _i++) {
            var _b = _a[_i], name_3 = _b[0], def = _b[1];
            var type = this.parseType(def, schema);
            definitions.set(name_3, type);
        }
        return definitions;
    };
    /**
     * Convert definition name to TypeScript type name.
     *
     * @param name - Definition name from schema
     * @returns TypeScript-friendly type name
     */
    SchemaParser.prototype.toTypeName = function (name) {
        // Remove common ARM suffixes and standardize to Props
        // "AddressSpacePropertiesFormat" -> "AddressSpace"
        // "BackupPolicyProperties" -> "BackupPolicyProps"
        return name
            .replace(/PropertiesFormat$/, '')
            .replace(/Format$/, '')
            .replace(/Properties$/, 'Props');
    };
    return SchemaParser;
}());
exports.SchemaParser = SchemaParser;
