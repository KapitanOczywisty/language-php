const { loadRawGrammarDefinition } = require("./loadGrammar");
const { toRegExp } = require("oniguruma-to-es");
const { count, expandAll } = require("regex-to-strings");

const MAX_REGEX_EXPANSIONS = 25_000;

const stripCaseInsensitiveFlag = (flags) => {
  const hasDisabledFlags = flags.includes("-");
  const [enabledFlags, disabledFlags] = flags.split("-", 2);

  const normalizedEnabledFlags = enabledFlags.replace(/i/gi, "");
  const normalizedDisabledFlags = hasDisabledFlags
    ? String(disabledFlags ?? "").replace(/i/gi, "")
    : null;

  if (!hasDisabledFlags) {
    return normalizedEnabledFlags;
  }

  if (
    normalizedEnabledFlags.length === 0 &&
    normalizedDisabledFlags.length === 0
  ) {
    return "";
  }

  if (normalizedDisabledFlags.length === 0) {
    return normalizedEnabledFlags;
  }

  if (normalizedEnabledFlags.length === 0) {
    return `-${normalizedDisabledFlags}`;
  }

  return `${normalizedEnabledFlags}-${normalizedDisabledFlags}`;
};

const stripCaseInsensitiveInlineFlags = (pattern) => {
  const withoutGlobalInlineFlags = pattern.replace(
    /\(\?([a-z-]+)\)/gi,
    (match, flags) => {
      const normalizedFlags = stripCaseInsensitiveFlag(flags);
      return normalizedFlags.length === 0 ? "" : `(?${normalizedFlags})`;
    },
  );

  return withoutGlobalInlineFlags.replace(
    /\(\?([a-z-]+):/gi,
    (match, flags) => {
      const normalizedFlags = stripCaseInsensitiveFlag(flags);
      return normalizedFlags.length === 0 ? "(?:" : `(?${normalizedFlags}:`;
    },
  );
};

const expandRegexSymbols = (pattern) => {
  const normalizedPattern = stripCaseInsensitiveInlineFlags(pattern);
  const regex = toRegExp(normalizedPattern, {
    target: "ES2018",
    avoidSubclass: true,
  });

  const expansionCount = count(regex);
  if (
    !Number.isFinite(expansionCount) ||
    expansionCount > MAX_REGEX_EXPANSIONS
  ) {
    throw new Error(
      `Regex expansion count ${expansionCount} exceeds limit ${MAX_REGEX_EXPANSIONS}.`,
    );
  }

  return [...new Set(expandAll(regex))];
};

const extractPatternRulesForScope = (expectedScope) => {
  const grammar = loadRawGrammarDefinition("source.php");
  const rules = [];
  const queue = [grammar];

  while (queue.length > 0) {
    const node = queue.pop();

    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }

    if (!node || typeof node !== "object") {
      continue;
    }

    if (
      typeof node.name === "string" &&
      typeof node.match === "string" &&
      expectedScope.test(node.name)
    ) {
      rules.push(node);
    }

    Object.values(node).forEach((value) => queue.push(value));
  }

  return rules;
};

module.exports = {
  expandRegexSymbols,
  extractPatternRulesForScope,
};
