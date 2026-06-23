/** Shared types for the Microsoft icons -> draw.io library generator. */

/** Rules that decide whether an SVG belongs to a given product family. */
export interface MatchRule {
  /**
   * Case-insensitive substrings matched against the source root
   * (the zip basename or the top-level folder under the input dir).
   * If empty, the source root is not constrained.
   */
  sources?: string[];
  /**
   * Case-insensitive substrings; at least one must appear in the file's
   * relative path for the rule to match. If empty, not constrained.
   */
  pathIncludes?: string[];
  /**
   * Case-insensitive substrings; if any appears in the relative path the
   * rule is rejected (used to carve a sub-set out of a shared source).
   */
  pathExcludes?: string[];
  /** When true the rule matches any otherwise-unclassified icon (last resort). */
  catchAll?: boolean;
}

/** A single product family and how its icons are recognised + titled. */
export interface FamilyConfig {
  id: string;
  name: string;
  description?: string;
  /**
   * One rule, or a list of rules OR'd together: an icon belongs to the family
   * if ANY rule matches. Use multiple rules to combine a strong source match
   * (e.g. a standalone Entra zip) with a path-based carve-out from a shared
   * source (e.g. the identity/security folders of the Azure set).
   */
  match: MatchRule | MatchRule[];
  /**
   * Optional leading brand prefixes (case-insensitive) stripped from a derived
   * title for this family (e.g. "fabric" in "fabric-lakehouse").
   */
  stripTokens?: string[];
  /**
   * Optional noise tokens (case-insensitive, whole word) removed from titles
   * anywhere they appear — e.g. icon sizes ("16","48") and style words
   * ("filled","regular","color","scalable").
   */
  dropTokens?: string[];
  /**
   * When true, multiple icons that reduce to the same title (e.g. size/style
   * variants of one Fabric icon) collapse to a single library entry instead of
   * being suffixed " (2)", " (3)", …
   */
  collapseVariants?: boolean;
  /**
   * When collapsing variants, source-path substrings (case-insensitive) listed
   * in priority order; the variant whose path matches the earliest entry wins.
   */
  preferTokens?: string[];
}

/** Top-level generator configuration (config/families.json). */
export interface GeneratorConfig {
  /** Target icon size in px; the longer edge is scaled to this, aspect preserved. */
  iconSizePx: number;
  families: FamilyConfig[];
}

/** A discovered SVG source file on disk. */
export interface SvgSource {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the input/extraction base, forward-slashed. */
  relPath: string;
  /** First segment of relPath: the zip basename or top-level folder name. */
  sourceRoot: string;
}

/** A processed icon ready to become a library entry. */
export interface ProcessedIcon {
  title: string;
  dataUri: string;
  w: number;
  h: number;
  /** Source-relative path, used for variant preference when collapsing. */
  sourcePath: string;
}

/** A draw.io mxlibrary entry (image-shape form). */
export interface LibraryEntry {
  data: string;
  w: number;
  h: number;
  title: string;
  aspect: 'fixed';
}
