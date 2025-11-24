/**
 * Pluralization and Singularization Utilities
 *
 * Provides functions for converting between singular and plural forms of English words.
 * Used for generating resource names, API paths, and database container names.
 *
 * @module @atakora/component/synthesis/pluralization
 *
 * @remarks
 * These utilities handle common English pluralization rules including:
 * - Standard plural forms (add 's')
 * - Irregular plurals (person → people, child → children)
 * - Words ending in 'y' (category → categories)
 * - Words ending in 'f' or 'fe' (leaf → leaves)
 * - Words ending in 's', 'x', 'z', 'ch', 'sh' (box → boxes)
 * - Words ending in 'o' (hero → heroes)
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { pluralize, singularize } from '@atakora/component/synthesis';
 *
 * // Standard pluralization
 * pluralize('user');     // 'users'
 * pluralize('product');  // 'products'
 *
 * // Irregular plurals
 * pluralize('person');   // 'people'
 * pluralize('child');    // 'children'
 *
 * // Special rules
 * pluralize('category'); // 'categories'
 * pluralize('leaf');     // 'leaves'
 * pluralize('hero');     // 'heroes'
 *
 * // Singularization
 * singularize('users');      // 'user'
 * singularize('people');     // 'person'
 * singularize('categories'); // 'category'
 * ```
 *
 * @example
 * With model names:
 * ```typescript
 * import { pluralize } from '@atakora/component/synthesis';
 *
 * const userModel = defineSchema('User', { ... });
 * const containerName = pluralize('User').toLowerCase(); // 'users'
 *
 * const productModel = defineSchema('Product', { ... });
 * const apiPath = `/api/${pluralize('Product').toLowerCase()}`; // '/api/products'
 * ```
 */

/**
 * Irregular plurals that don't follow standard English pluralization rules
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese',
  ox: 'oxen',
  sheep: 'sheep',
  deer: 'deer',
  fish: 'fish',
  series: 'series',
  species: 'species',
  moose: 'moose',
  quiz: 'quizzes',
  analysis: 'analyses',
  axis: 'axes',
  basis: 'bases',
  crisis: 'crises',
  diagnosis: 'diagnoses',
  ellipsis: 'ellipses',
  hypothesis: 'hypotheses',
  oasis: 'oases',
  paralysis: 'paralyses',
  parenthesis: 'parentheses',
  synthesis: 'syntheses',
  synopsis: 'synopses',
  thesis: 'theses',
};

/**
 * Pluralize a word according to English pluralization rules
 *
 * Converts a singular word to its plural form. Handles both regular and irregular plurals,
 * as well as special cases like words ending in 'y', 'f', 'fe', 'o', etc.
 *
 * @param word - The singular word to pluralize
 * @returns The pluralized form of the word
 *
 * @remarks
 * The function applies the following rules in order:
 * 1. Check for irregular plurals (e.g., person → people)
 * 2. Words ending in 's', 'x', 'z' → add 'es'
 * 3. Words ending in 'ch', 'sh' → add 'es'
 * 4. Words ending in consonant + 'y' → replace 'y' with 'ies'
 * 5. Words ending in 'f' → replace 'f' with 'ves'
 * 6. Words ending in 'fe' → replace 'fe' with 'ves'
 * 7. Words ending in consonant + 'o' → add 'es'
 * 8. Default → add 's'
 *
 * Case is preserved based on the first character of the input word.
 *
 * @example
 * Standard plurals:
 * ```typescript
 * pluralize('user');     // 'users'
 * pluralize('product');  // 'products'
 * pluralize('order');    // 'orders'
 * ```
 *
 * @example
 * Irregular plurals:
 * ```typescript
 * pluralize('person');   // 'people'
 * pluralize('child');    // 'children'
 * pluralize('man');      // 'men'
 * pluralize('woman');    // 'women'
 * pluralize('tooth');    // 'teeth'
 * pluralize('foot');     // 'feet'
 * pluralize('mouse');    // 'mice'
 * pluralize('goose');    // 'geese'
 * ```
 *
 * @example
 * Special endings:
 * ```typescript
 * pluralize('category'); // 'categories' (consonant + y → ies)
 * pluralize('leaf');     // 'leaves' (f → ves)
 * pluralize('knife');    // 'knives' (fe → ves)
 * pluralize('hero');     // 'heroes' (consonant + o → oes)
 * pluralize('box');      // 'boxes' (x → xes)
 * pluralize('buzz');     // 'buzzes' (z → zes)
 * pluralize('match');    // 'matches' (ch → ches)
 * pluralize('brush');    // 'brushes' (sh → shes)
 * ```
 *
 * @example
 * Case preservation:
 * ```typescript
 * pluralize('User');     // 'Users' (capitalized)
 * pluralize('PRODUCT');  // 'PRODUCTS' (uppercase)
 * pluralize('person');   // 'people' (lowercase)
 * pluralize('Person');   // 'People' (capitalized)
 * ```
 */
export function pluralize(word: string): string {
  if (!word) return word;

  const lower = word.toLowerCase();

  // Check irregular plurals
  if (IRREGULAR_PLURALS[lower]) {
    return matchCase(word, IRREGULAR_PLURALS[lower]);
  }

  // Already plural (ends with 's', 'x', 'z', 'ch', 'sh')
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z')) {
    return word + 'es';
  }
  if (lower.endsWith('ch') || lower.endsWith('sh')) {
    return word + 'es';
  }

  // Ends with consonant + 'y' → 'ies' (e.g., category → categories)
  if (lower.endsWith('y') && lower.length > 1 && !isVowel(lower[lower.length - 2])) {
    return word.slice(0, -1) + 'ies';
  }

  // Ends with 'f' or 'fe' → 'ves' (e.g., leaf → leaves)
  if (lower.endsWith('f')) {
    return word.slice(0, -1) + 'ves';
  }
  if (lower.endsWith('fe')) {
    return word.slice(0, -2) + 'ves';
  }

  // Ends with consonant + 'o' → 'oes' (e.g., hero → heroes)
  if (lower.endsWith('o') && lower.length > 1 && !isVowel(lower[lower.length - 2])) {
    return word + 'es';
  }

  // Default: add 's'
  return word + 's';
}

/**
 * Singularize a word according to English singularization rules
 *
 * Converts a plural word to its singular form. Handles both regular and irregular plurals,
 * reversing the rules applied by {@link pluralize}.
 *
 * @param word - The plural word to singularize
 * @returns The singular form of the word
 *
 * @remarks
 * The function applies the following rules in order:
 * 1. Check for irregular plurals in reverse (e.g., people → person)
 * 2. Words ending in 'ies' → replace with 'y'
 * 3. Words ending in 'ves' → replace with 'f'
 * 4. Words ending in 'oes' → remove 'es'
 * 5. Words ending in 'ses', 'xes', 'zes' → remove 'es'
 * 6. Words ending in 'ches', 'shes' → remove 'es'
 * 7. Words ending in 's' → remove 's'
 * 8. Default → return word unchanged
 *
 * Case is preserved based on the first character of the input word.
 *
 * @example
 * Standard singulars:
 * ```typescript
 * singularize('users');     // 'user'
 * singularize('products');  // 'product'
 * singularize('orders');    // 'order'
 * ```
 *
 * @example
 * Irregular singulars:
 * ```typescript
 * singularize('people');    // 'person'
 * singularize('children');  // 'child'
 * singularize('men');       // 'man'
 * singularize('women');     // 'woman'
 * singularize('teeth');     // 'tooth'
 * singularize('feet');      // 'foot'
 * singularize('mice');      // 'mouse'
 * singularize('geese');     // 'goose'
 * ```
 *
 * @example
 * Special endings:
 * ```typescript
 * singularize('categories'); // 'category' (ies → y)
 * singularize('leaves');     // 'leaf' (ves → f)
 * singularize('knives');     // 'knife' (ves → fe, though becomes 'knif')
 * singularize('heroes');     // 'hero' (oes → o)
 * singularize('boxes');      // 'box' (xes → x)
 * singularize('buzzes');     // 'buzz' (zes → z)
 * singularize('matches');    // 'match' (ches → ch)
 * singularize('brushes');    // 'brush' (shes → sh)
 * ```
 *
 * @example
 * Case preservation:
 * ```typescript
 * singularize('Users');     // 'User' (capitalized)
 * singularize('PRODUCTS');  // 'PRODUCT' (uppercase)
 * singularize('people');    // 'person' (lowercase)
 * singularize('People');    // 'Person' (capitalized)
 * ```
 */
export function singularize(word: string): string {
  if (!word) return word;

  const lower = word.toLowerCase();

  // Check reverse irregular plurals
  for (const [singular, plural] of Object.entries(IRREGULAR_PLURALS)) {
    if (lower === plural) {
      return matchCase(word, singular);
    }
  }

  // Ends with 'ies' → 'y' (e.g., categories → category)
  if (lower.endsWith('ies') && lower.length > 3) {
    return word.slice(0, -3) + 'y';
  }

  // Ends with 'ves' → 'f' or 'fe' (e.g., leaves → leaf)
  if (lower.endsWith('ves') && lower.length > 3) {
    return word.slice(0, -3) + 'f';
  }

  // Ends with 'oes' → 'o' (e.g., heroes → hero)
  if (lower.endsWith('oes') && lower.length > 3) {
    return word.slice(0, -2);
  }

  // Ends with 'ses', 'xes', 'zes', 'ches', 'shes' → remove 'es'
  if (lower.length > 3) {
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes')) {
      return word.slice(0, -2);
    }
  }
  if (lower.length > 4) {
    if (lower.endsWith('ches') || lower.endsWith('shes')) {
      return word.slice(0, -2);
    }
  }

  // Ends with 's' → remove 's'
  if (lower.endsWith('s') && lower.length > 1) {
    return word.slice(0, -1);
  }

  // Already singular
  return word;
}

/**
 * Check if a character is a vowel
 *
 * @param char - Character to check
 * @returns True if the character is a vowel (a, e, i, o, u), case-insensitive
 *
 * @internal
 */
function isVowel(char: string | undefined): boolean {
  if (!char) return false;
  return /[aeiou]/i.test(char);
}

/**
 * Match the case of a target word to match a source word's case pattern
 *
 * Preserves capitalization based on the first character of the source word:
 * - If source starts with uppercase, capitalizes the target
 * - If source is all uppercase, converts target to uppercase
 * - Otherwise, returns target in lowercase
 *
 * @param source - Source word whose case pattern to match
 * @param target - Target word to apply case pattern to
 * @returns Target word with case pattern matching source
 *
 * @internal
 *
 * @example
 * ```typescript
 * matchCase('User', 'people');    // 'People'
 * matchCase('user', 'people');    // 'people'
 * matchCase('USER', 'people');    // 'PEOPLE'
 * ```
 */
function matchCase(source: string, target: string): string {
  if (!source || !target) return target;

  // Check if source is all uppercase
  if (source === source.toUpperCase()) {
    return target.toUpperCase();
  }

  // Check if first character is uppercase
  if (source[0] === source[0].toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }

  // Default to lowercase
  return target.toLowerCase();
}
