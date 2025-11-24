/**
 * Migration Generator
 *
 * Automatically generates migrations by comparing schema versions.
 * Detects added/removed/renamed/changed fields and generates appropriate migration code.
 */

import type {
  SchemaChange,
  Migration,
  SemanticVersion,
  SchemaComparison,
  BreakingChange,
  BreakingChangeAnalysis,
  AddFieldChange,
  RemoveFieldChange,
  RenameFieldChange,
  ChangeFieldTypeChange,
  DeprecateFieldChange,
} from './types';
import { BreakingChangeType } from './types';
import { MigrationBuilder } from './migrations';
import { compareVersions, bumpVersion, isVersionGreater } from './schema-version';

// ============================================================================
// Schema Comparison
// ============================================================================

/**
 * Compare two schema versions and detect changes
 */
export function compareSchemas(
  oldSchema: any,
  newSchema: any,
  oldVersion: SemanticVersion,
  newVersion: SemanticVersion
): SchemaComparison {
  const changes: SchemaChange[] = [];
  let hasBreakingChanges = false;

  // Process old schema models
  const oldModels = extractModels(oldSchema);
  const newModels = extractModels(newSchema);

  // Check for removed models
  for (const [modelName, oldModel] of Object.entries(oldModels)) {
    if (!newModels[modelName]) {
      changes.push({
        type: 'removeModel',
        model: modelName,
        archive: true,
        reason: 'Model removed in new schema version',
      });
      hasBreakingChanges = true;
    }
  }

  // Check for added models
  for (const [modelName, newModel] of Object.entries(newModels)) {
    if (!oldModels[modelName]) {
      changes.push({
        type: 'addModel',
        model: modelName,
        definition: newModel,
        reason: 'Model added in new schema version',
      });
    }
  }

  // Check for field-level changes in existing models
  for (const [modelName, oldModel] of Object.entries(oldModels)) {
    const newModel = newModels[modelName];
    if (!newModel) continue;

    const fieldChanges = compareModelFields(modelName, oldModel, newModel);
    changes.push(...fieldChanges.changes);
    hasBreakingChanges = hasBreakingChanges || fieldChanges.hasBreaking;
  }

  return {
    from: oldVersion,
    to: newVersion,
    changes,
    breaking: hasBreakingChanges,
  };
}

/**
 * Compare fields between two model versions
 */
function compareModelFields(
  modelName: string,
  oldModel: any,
  newModel: any
): { changes: SchemaChange[]; hasBreaking: boolean } {
  const changes: SchemaChange[] = [];
  let hasBreaking = false;

  const oldFields = extractFields(oldModel);
  const newFields = extractFields(newModel);

  // Check for removed fields
  for (const [fieldName, oldField] of Object.entries(oldFields)) {
    if (!newFields[fieldName]) {
      // Check if field was renamed (heuristic: similar field added)
      const possibleRename = findPossibleRename(fieldName, oldField, newFields, oldFields);

      if (possibleRename) {
        changes.push({
          type: 'renameField',
          model: modelName,
          from: fieldName,
          to: possibleRename,
          reason: 'Field appears to be renamed based on type similarity',
        } as RenameFieldChange);
      } else {
        changes.push({
          type: 'removeField',
          model: modelName,
          field: fieldName,
          archive: true,
          reason: 'Field removed in new schema version',
        } as RemoveFieldChange);

        // Check if field was required
        if (isFieldRequired(oldField)) {
          hasBreaking = true;
        }
      }
    }
  }

  // Check for added fields
  for (const [fieldName, newField] of Object.entries(newFields)) {
    if (!oldFields[fieldName]) {
      // Skip if this was detected as a rename target
      const isRenameTarget = changes.some(
        (c) => c.type === 'renameField' && (c as RenameFieldChange).to === fieldName
      );

      if (!isRenameTarget) {
        changes.push({
          type: 'addField',
          model: modelName,
          field: fieldName,
          definition: newField,
          defaultValue: getFieldDefault(newField),
          reason: 'Field added in new schema version',
        } as AddFieldChange);

        // Check if new field is required without default
        if (isFieldRequired(newField) && !hasDefault(newField)) {
          hasBreaking = true;
        }
      }
    }
  }

  // Check for type changes in existing fields
  for (const [fieldName, oldField] of Object.entries(oldFields)) {
    const newField = newFields[fieldName];
    if (!newField) continue;

    const typeChange = detectFieldTypeChange(oldField, newField);
    if (typeChange) {
      changes.push({
        type: 'changeType',
        model: modelName,
        field: fieldName,
        fromType: typeChange.from,
        toType: typeChange.to,
        reason: 'Field type changed',
      } as ChangeFieldTypeChange);

      if (typeChange.breaking) {
        hasBreaking = true;
      }
    }

    // Check for deprecation
    if (!isFieldDeprecated(oldField) && isFieldDeprecated(newField)) {
      changes.push({
        type: 'deprecateField',
        model: modelName,
        field: fieldName,
        message: getDeprecationMessage(newField) || 'Field deprecated',
      } as DeprecateFieldChange);
    }
  }

  return { changes, hasBreaking };
}

// ============================================================================
// Breaking Change Detection
// ============================================================================

/**
 * Analyze changes for breaking changes
 */
export function analyzeBreakingChanges(changes: SchemaChange[]): BreakingChangeAnalysis {
  const breakingChanges: BreakingChange[] = [];
  const safeChanges: SchemaChange[] = [];

  for (const change of changes) {
    const breaking = detectBreakingChange(change);
    if (breaking) {
      breakingChanges.push(breaking);
    } else {
      safeChanges.push(change);
    }
  }

  // Determine recommended version bump
  let recommendedBump: 'major' | 'minor' | 'patch';
  if (breakingChanges.length > 0) {
    recommendedBump = 'major';
  } else if (changes.some((c) => c.type === 'addField' || c.type === 'addModel')) {
    recommendedBump = 'minor';
  } else {
    recommendedBump = 'patch';
  }

  return {
    hasBreakingChanges: breakingChanges.length > 0,
    breakingChanges,
    safeChanges,
    recommendedVersionBump: recommendedBump,
  };
}

/**
 * Detect if a change is breaking
 */
function detectBreakingChange(change: SchemaChange): BreakingChange | null {
  switch (change.type) {
    case 'removeField':
      if (!change.archive) {
        return {
          type: BreakingChangeType.FIELD_REMOVED,
          model: change.model,
          field: change.field,
          description: `Field '${change.field}' removed without archiving`,
          suggestion: 'Archive the field data before removal or deprecate first',
        };
      }
      break;

    case 'removeModel':
      if (!change.archive) {
        return {
          type: BreakingChangeType.MODEL_REMOVED,
          model: change.model,
          description: `Model '${change.model}' removed without archiving`,
          suggestion: 'Archive the model data before removal or deprecate first',
        };
      }
      break;

    case 'addField':
      // Breaking if required without default
      if (change.definition?.required && !change.defaultValue) {
        return {
          type: BreakingChangeType.REQUIRED_FIELD_ADDED,
          model: change.model,
          field: change.field,
          description: `Required field '${change.field}' added without default value`,
          suggestion: 'Provide a default value for existing records',
        };
      }
      break;

    case 'changeType':
      // Most type changes are breaking unless compatible
      if (!areTypesCompatible(change.fromType, change.toType)) {
        return {
          type: BreakingChangeType.INCOMPATIBLE_TYPE_CHANGE,
          model: change.model,
          field: change.field,
          description: `Field '${change.field}' type changed from ${change.fromType} to ${change.toType}`,
          suggestion: 'Provide a transformation function or migrate in stages',
        };
      }
      break;
  }

  return null;
}

// ============================================================================
// Migration Generation
// ============================================================================

/**
 * Generate a migration from schema comparison
 */
export function generateMigration(
  comparison: SchemaComparison,
  options?: {
    description?: string;
    autoApply?: boolean;
    includeRollback?: boolean;
  }
): Migration {
  const builder = new MigrationBuilder()
    .from(comparison.from)
    .to(comparison.to)
    .addChanges(comparison.changes)
    .describe(options?.description || `Migration from ${comparison.from} to ${comparison.to}`)
    .setAuto(options?.autoApply ?? !comparison.breaking);

  // Generate transform function if needed
  const transform = generateTransformFunction(comparison.changes);
  if (transform) {
    builder.transform(transform);
  }

  // Generate rollback if requested
  if (options?.includeRollback) {
    const rollback = generateRollbackFunction(comparison.changes);
    if (rollback) {
      builder.rollback(rollback);
    }
  }

  return builder.build();
}

/**
 * Generate transform function for migration
 */
function generateTransformFunction(changes: SchemaChange[]): ((data: any) => any) | undefined {
  const hasTransformableChanges = changes.some(
    (c) => c.type === 'renameField' || c.type === 'changeType' || c.type === 'addField'
  );

  if (!hasTransformableChanges) {
    return undefined;
  }

  return (data: any) => {
    let result = Array.isArray(data) ? [...data] : { ...data };

    for (const change of changes) {
      switch (change.type) {
        case 'renameField':
          if (Array.isArray(result)) {
            result = result.map((item) => {
              const { [change.from]: value, ...rest } = item;
              return { ...rest, [change.to]: value };
            });
          } else {
            const { [change.from]: value, ...rest } = result;
            result = { ...rest, [change.to]: value };
          }
          break;

        case 'addField':
          if (change.defaultValue !== undefined) {
            if (Array.isArray(result)) {
              result = result.map((item) => ({
                ...item,
                [change.field]: change.defaultValue,
              }));
            } else {
              result = {
                ...result,
                [change.field]: change.defaultValue,
              };
            }
          }
          break;

        case 'changeType':
          if (change.transform) {
            if (Array.isArray(result)) {
              result = result.map((item) => ({
                ...item,
                [change.field]: change.transform!(item[change.field]),
              }));
            } else {
              result = {
                ...result,
                [change.field]: change.transform!(result[change.field]),
              };
            }
          }
          break;
      }
    }

    return result;
  };
}

/**
 * Generate rollback function for migration
 */
function generateRollbackFunction(changes: SchemaChange[]): ((data: any) => any) | undefined {
  // Return a rollback function if there are reversible changes
  const hasReversibleChanges = changes.some(
    (c) => c.type === 'addField' || c.type === 'removeField' || c.type === 'renameField'
  );

  if (!hasReversibleChanges) {
    return undefined;
  }

  return (data: any) => {
    let result = Array.isArray(data) ? [...data] : { ...data };

    // Apply changes in reverse order
    const reversedChanges = [...changes].reverse();

    for (const change of reversedChanges) {
      switch (change.type) {
        case 'addField':
          // Rollback: remove the added field
          if (Array.isArray(result)) {
            result = result.map((item) => {
              const { [change.field]: removed, ...rest } = item;
              return rest;
            });
          } else {
            const { [change.field]: removed, ...rest } = result;
            result = rest;
          }
          break;

        case 'removeField':
          // Rollback: restore removed field (would need stored data)
          // This is a placeholder - in real implementation, would need to store removed data
          break;

        case 'renameField':
          // Rollback: reverse the rename
          if (Array.isArray(result)) {
            result = result.map((item) => {
              const { [change.to]: value, ...rest } = item;
              return { ...rest, [change.from]: value };
            });
          } else {
            const { [change.to]: value, ...rest } = result;
            result = { ...rest, [change.from]: value };
          }
          break;
      }
    }

    return result;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract models from schema
 */
function extractModels(schema: any): Record<string, any> {
  if (schema?.models) return schema.models;
  if (schema?.schema?.models) return schema.schema.models;
  if (typeof schema === 'object') return schema;
  return {};
}

/**
 * Extract fields from model
 */
function extractFields(model: any): Record<string, any> {
  if (model?.fields) return model.fields;
  if (model?._config?.fields) return model._config.fields;
  if (typeof model === 'object') return model;
  return {};
}

/**
 * Check if field is required
 */
function isFieldRequired(field: any): boolean {
  return (
    field?.required === true ||
    field?.isRequired === true ||
    field?.validations?.some((v: any) => v.type === 'required')
  );
}

/**
 * Check if field has default value
 */
function hasDefault(field: any): boolean {
  return field?.default !== undefined || field?.defaultValue !== undefined;
}

/**
 * Get field default value
 */
function getFieldDefault(field: any): any {
  return field?.default ?? field?.defaultValue;
}

/**
 * Check if field is deprecated
 */
function isFieldDeprecated(field: any): boolean {
  return field?.deprecated === true || field?.metadata?.deprecated === true;
}

/**
 * Get deprecation message
 */
function getDeprecationMessage(field: any): string | undefined {
  return field?.deprecationMessage || field?.metadata?.deprecationMessage;
}

/**
 * Find possible field rename
 */
function findPossibleRename(
  oldName: string,
  oldField: any,
  newFields: Record<string, any>,
  oldFields: Record<string, any>
): string | null {
  // Look for new fields with same type that don't exist in old
  for (const [newName, newField] of Object.entries(newFields)) {
    if (oldFields[newName]) continue; // Skip existing fields

    // Check if types match
    if (getFieldType(oldField) === getFieldType(newField)) {
      // Additional heuristics: similar names
      if (areSimilarNames(oldName, newName)) {
        return newName;
      }
    }
  }

  return null;
}

/**
 * Get field type
 */
function getFieldType(field: any): string {
  return field?.type || field?._type || 'unknown';
}

/**
 * Check if field names are similar (simple heuristic)
 */
function areSimilarNames(name1: string, name2: string): boolean {
  // Convert to lowercase for comparison
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Check for common patterns
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check for common word replacements
  const commonReplacements = [
    ['name', 'fullname'],
    ['firstname', 'first'],
    ['lastname', 'last'],
    ['email', 'emailaddress'],
    ['phone', 'phonenumber'],
    ['addr', 'address'],
  ];

  for (const [a, b] of commonReplacements) {
    if ((n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a))) {
      return true;
    }
  }

  return false;
}

/**
 * Detect field type change
 */
function detectFieldTypeChange(
  oldField: any,
  newField: any
): { from: string; to: string; breaking: boolean } | null {
  const oldType = getFieldType(oldField);
  const newType = getFieldType(newField);

  if (oldType === newType) {
    return null;
  }

  return {
    from: oldType,
    to: newType,
    breaking: !areTypesCompatible(oldType, newType),
  };
}

/**
 * Check if types are compatible for migration
 */
function areTypesCompatible(fromType: string, toType: string): boolean {
  // Same type is always compatible
  if (fromType === toType) return true;

  // Compatible type conversions
  const compatibleConversions: Record<string, string[]> = {
    number: ['string'], // number can be converted to string
    boolean: ['string', 'number'], // boolean can be converted to string or number
    id: ['string'], // id can be treated as string
    enum: ['string'], // enum values are strings
  };

  return compatibleConversions[fromType]?.includes(toType) || false;
}

// ============================================================================
// Migration Code Generation
// ============================================================================

/**
 * Generate TypeScript migration code
 */
export function generateMigrationCode(migration: Migration): string {
  const lines: string[] = [];

  lines.push(`import { Migration } from '@atakora/component/schema/versioning';`);
  lines.push('');
  lines.push(
    `export const migration_${migration.from.replace(/\./g, '_')}_to_${migration.to.replace(/\./g, '_')}: Migration = {`
  );
  lines.push(`  from: '${migration.from}',`);
  lines.push(`  to: '${migration.to}',`);
  lines.push(`  description: '${migration.description || ''}',`);
  lines.push(`  auto: ${migration.auto ?? true},`);
  lines.push(`  changes: [`);

  for (const change of migration.changes) {
    lines.push(`    ${JSON.stringify(change, null, 2).replace(/\n/g, '\n    ')},`);
  }

  lines.push(`  ],`);

  if (migration.transform) {
    lines.push(`  transform: (data) => {`);
    lines.push(`    // TODO: Implement data transformation`);
    lines.push(`    return data;`);
    lines.push(`  },`);
  }

  if (migration.rollback) {
    lines.push(`  rollback: (data) => {`);
    lines.push(`    // TODO: Implement rollback transformation`);
    lines.push(`    return data;`);
    lines.push(`  },`);
  }

  lines.push(`};`);

  return lines.join('\n');
}
