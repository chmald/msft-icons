/** Derive clean, human-readable shape titles from icon filenames. */

/** Acronyms that should be fully upper-cased even when they arrive lowercase. */
const ACRONYMS = new Set([
  'ai', 'ml', 'api', 'apis', 'sql', 'vm', 'vms', 'aks', 'acr', 'aci', 'cdn',
  'dns', 'vpn', 'iot', 'gpu', 'cpu', 'db', 'os', 'sdk', 'cli', 'rest', 'http',
  'https', 'ad', 'adx', 'ssd', 'hdd', 'ip', 'lan', 'wan', 'nat', 'ssl', 'tls',
  'crm', 'erp', 'bi', 'ocr', 'nlp', 'llm', 'rag', 'kql', 'hpc', 'cdc', 'etl',
  'id', 'ids', 'mfa', 'rbac', 'waf', 'ddos', 'dr', 'ha', 'vnet', 'nsg',
]);

/** Tokens that keep specific mixed casing regardless of position. */
const SPECIAL_CASE: Record<string, string> = {
  cosmosdb: 'CosmosDB',
  devops: 'DevOps',
  powerbi: 'PowerBI',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  nosql: 'NoSQL',
  saas: 'SaaS',
  paas: 'PaaS',
  iaas: 'IaaS',
  openai: 'OpenAI',
  github: 'GitHub',
  signalr: 'SignalR',
  graphql: 'GraphQL',
};

/** Generic leading prefixes stripped from any filename. */
const PREFIX_PATTERNS: RegExp[] = [
  /^\d+\s*[-_]?\s*/, // numeric id, e.g. "10021-"
  /^icon[-_\s]+service[-_\s]+/i,
  /^icon[-_\s]+/i,
];

/**
 * Strip a leading brand/boilerplate prefix (case-insensitive), guarding
 * against emptying the string.
 */
function stripPrefix(name: string, token: string): string {
  const re = new RegExp(`^${escapeRegExp(token)}[-_\\s]+`, 'i');
  const next = name.replace(re, '');
  return next.trim().length > 0 ? next : name;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Insert spaces at camelCase / acronym boundaries. */
function splitCamel(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/** Split a string into cleaned word tokens. */
function tokenize(s: string): string[] {
  return splitCamel(s)
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 0);
}

function titleCaseToken(token: string): string {
  const lower = token.toLowerCase();
  if (SPECIAL_CASE[lower]) return SPECIAL_CASE[lower];
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  // Preserve tokens that already carry internal capitals (e.g. "DevOps").
  if (/[a-z]/.test(token) && /[A-Z]/.test(token.slice(1))) return token;
  // Preserve short all-caps acronyms.
  if (/^[A-Z0-9]{2,5}$/.test(token)) return token;
  // Keep pure numbers / version-ish tokens unchanged.
  if (/^[0-9]+$/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Turn an icon filename (with or without extension/path) into a clean title.
 *
 * @param fileName base name (extension allowed)
 * @param stripTokens family-specific leading brand prefixes to remove
 * @param dropTokens family-specific noise tokens to drop anywhere (e.g. sizes/styles)
 */
export function deriveTitle(
  fileName: string,
  stripTokens: string[] = [],
  dropTokens: string[] = [],
): string {
  const dropSet = new Set(dropTokens.map((t) => t.toLowerCase()));
  const keep = (tokens: string[]): string[] => tokens.filter((t) => !dropSet.has(t.toLowerCase()));

  // Strip directory and extension.
  let raw = fileName.replace(/\\/g, '/');
  raw = raw.slice(raw.lastIndexOf('/') + 1).replace(/\.svg$/i, '');

  // Strip generic prefixes (numeric ids, icon-service-, ...).
  let work = raw;
  for (const re of PREFIX_PATTERNS) work = work.replace(re, '');
  const generic = work;

  // Strip family brand prefixes.
  for (const token of stripTokens) work = stripPrefix(work, token);

  // Primary attempt: brand-stripped, noise-dropped.
  let tokens = keep(tokenize(work));
  // Fallback 1: noise-dropped without brand strip (keeps flagship "Brand 365" icons).
  if (tokens.length === 0) tokens = keep(tokenize(generic));
  // Fallback 2: raw, nothing dropped.
  if (tokens.length === 0) tokens = tokenize(raw);

  return tokens.map(titleCaseToken).join(' ');
}
