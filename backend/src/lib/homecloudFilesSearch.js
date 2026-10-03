'use strict';

/**
 * HomeCloud Files — literal search encoding for PostgREST filters.
 *
 * Authority: frozen Files V1 search contract (trim-normalized,
 * case-insensitive, server-backed, Household-authoritative, literal substring).
 *
 * The search string is USER DATA. It is never SQL LIKE syntax, never
 * PostgREST filter syntax, and never a wildcard expression: `%`, `_`, `\`,
 * `"`, `(`, `)`, `,`, `.`, `:` and any other filter metacharacter have no
 * special user-facing meaning.
 *
 * Two independent grammars have to be satisfied, in this order:
 *
 *  1. Postgres ILIKE pattern. `%` and `_` are wildcards and `\` is the default
 *     LIKE escape character, so each is escaped to match itself literally.
 *     Without this layer, searching `%` would return EVERY File of the
 *     Household and searching `_` would match any single character.
 *
 *  2. PostgREST filter grammar. Inside a logic tree (`.or()` / `.and()`) the
 *     reserved characters `,` `.` `:` `*` `(` `)` split or terminate a filter,
 *     so a value that travels through a logic tree is carried inside double
 *     quotes; inside quotes `"` is written `\"` and `\` is written `\\`
 *     (https://postgrest.org/en/stable/references/api/url_grammar.html).
 *
 *     Quoting is required ONLY inside a logic tree. The installed PostgREST
 *     does NOT unquote a plain single filter value: `?name=ilike."%a%"`
 *     searches for a name that literally contains the `"` characters, so a
 *     quoted value must never be handed to `.ilike()` on its own. A plain
 *     filter value runs to the end of the parameter, so its reserved
 *     characters need no quoting and are inert.
 *
 * Both layers are pure functions of the raw user text, so a search never
 * changes WHAT the user typed — only how that exact text is represented. No
 * character is ever replaced by a space to keep a parser happy.
 */

// Postgres LIKE metacharacters: the two wildcards plus the default escape char.
const LIKE_METACHARACTERS = /[\\%_]/g;

/**
 * Encode user text as a Postgres ILIKE pattern fragment that matches it
 * literally. No wrapping: this is the fragment, not the "contains" pattern.
 */
function toLiteralLikePattern(value) {
  return String(value).replace(LIKE_METACHARACTERS, (character) => `\\${character}`);
}

/**
 * The canonical "contains this literal text" ILIKE pattern.
 *
 * Use this for a PLAIN filter (`.ilike(column, value)`), where PostgREST takes
 * the value verbatim up to the end of the parameter.
 */
function literalContainsPattern(search) {
  return `%${toLiteralLikePattern(search)}%`;
}

/**
 * Carry a value through a PostgREST LOGIC TREE (`.or()` / `.and()`), where the
 * reserved characters would otherwise split or terminate the filter. Inside
 * double quotes `"` is `\"` and `\` is `\\`.
 */
function toPostgrestLogicTreeValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The canonical "contains this literal text" value for a filter INSIDE a logic
 * tree. Same literal pattern as `literalContainsPattern`, additionally quoted
 * so no user character can be read as filter grammar.
 */
function literalContainsLogicTreeValue(search) {
  return toPostgrestLogicTreeValue(literalContainsPattern(search));
}

/**
 * Canonical Files `.or()` filter: literal substring match on display_name OR
 * note. Both columns carry the exact same encoded value.
 */
function buildFilesSearchOrFilter(search) {
  const value = literalContainsLogicTreeValue(search);
  return `display_name.ilike.${value},note.ilike.${value}`;
}

module.exports = {
  toLiteralLikePattern,
  toPostgrestLogicTreeValue,
  literalContainsPattern,
  literalContainsLogicTreeValue,
  buildFilesSearchOrFilter,
};
