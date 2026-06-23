import type { FamilyConfig, MatchRule, SvgSource } from './types.js';

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

/** Does a single SVG source satisfy one match rule? */
function ruleMatches(src: SvgSource, rule: MatchRule): boolean {
  const sources = rule.sources ?? [];
  const includes = rule.pathIncludes ?? [];
  const excludes = rule.pathExcludes ?? [];

  if (excludes.length > 0 && includesAny(src.relPath, excludes)) return false;
  if (rule.catchAll) return true;

  // A rule with no positive constraints must not silently match everything.
  if (sources.length === 0 && includes.length === 0) return false;

  const sourceOk = sources.length === 0 || includesAny(src.sourceRoot, sources);
  const includeOk = includes.length === 0 || includesAny(src.relPath, includes);
  return sourceOk && includeOk;
}

/** Does a single SVG source match a family (ANY of its rules)? */
export function matchesFamily(src: SvgSource, family: FamilyConfig): boolean {
  const rules = Array.isArray(family.match) ? family.match : [family.match];
  return rules.some((rule) => ruleMatches(src, rule));
}

export interface ClassifyResult {
  /** familyId -> matched sources */
  byFamily: Map<string, SvgSource[]>;
  /** sources that matched no family */
  unclassified: SvgSource[];
}

/**
 * Assign each SVG source to the first family (in config order) whose rules
 * match. Families should be ordered most-specific first.
 */
export function classify(sources: SvgSource[], families: FamilyConfig[]): ClassifyResult {
  const byFamily = new Map<string, SvgSource[]>();
  for (const f of families) byFamily.set(f.id, []);
  const unclassified: SvgSource[] = [];

  for (const src of sources) {
    const family = families.find((f) => matchesFamily(src, f));
    if (family) {
      byFamily.get(family.id)!.push(src);
    } else {
      unclassified.push(src);
    }
  }
  return { byFamily, unclassified };
}
