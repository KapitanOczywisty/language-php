{loadGrammar} = require('../utils/loadGrammar')
require('../utils/compatibleExpect')
{expect} = require('chai')
{
  UPDATE_SNAPSHOTS
  readIdentifierList
  readSnapshot
  writeSnapshot
} = require('../utils/knownSymbolsFixtures')
{expandRegexSymbols, extractPatternRulesForScope} = require('../utils/knownSymbolsRegex')

normalizeIdentifier = (value) -> value.toLowerCase()

formatEntriesList = (entries) ->
  sortedEntries = [...entries].sort(([symbolA, scopeA], [symbolB, scopeB]) ->
    scopeCompare = String(scopeA ? '').localeCompare(String(scopeB ? ''))
    unless scopeCompare is 0
      return scopeCompare
    String(symbolA ? '').localeCompare(String(symbolB ? ''))
  )

  sortedEntries.map(([symbol, scope]) ->
    "#{symbol} (#{scope})").join("\n") + "\n Total: " + entries.length

describe 'PHP known symbols', ->
  grammar = null
  before ->
    grammar = await loadGrammar('source.php')

  targets = [
    {
      name: 'classes'
      knownSymbolsFile: 'classes.properties'
      expectedScope: /^support\.class\.builtin\.php$/
      sourceFormatFn: (symbol) -> "new #{symbol}();"
    }
    {
      name: 'constants'
      knownSymbolsFile: 'constants.properties'
      expectedScope: /^support\.constant\..+\.php$/
      sourceFormatFn: (symbol) -> "#{symbol};"
    }
    {
      name: 'functions'
      knownSymbolsFile: 'functions.properties'
      expectedScope: /^support\.function\..+\.php$/
      sourceFormatFn: (symbol) -> "#{symbol}();"
    }
  ]

  targets.forEach (target) ->
    describe "#{target.name}", ->
      snapshotName = "#{target.name}.snapshot.json"
      symbols = readIdentifierList(target.knownSymbolsFile)
      knownSymbols = new Set(symbols.map((symbol) -> normalizeIdentifier(symbol)))
      scopeCache = new Map()
      scopesCache = null

      scopeForSymbol = (identifier) ->
        if scopeCache.has(identifier)
          return scopeCache.get(identifier)

        {tokens} = grammar.tokenizeLine(target.sourceFormatFn(identifier))
        token = tokens.find((item) -> item.value is identifier)
        scope = if Array.isArray(token?.scopes) and token.scopes.length > 0 then token.scopes[token.scopes.length - 1] else null
        scopeCache.set(identifier, scope)
        scope

      captureScopes = ->
        if scopesCache?
          return scopesCache

        scopesCache = {}
        symbols.forEach (symbol) ->
          scopesCache[symbol] = scopeForSymbol(symbol)
        scopesCache

      it "should match scopes snapshot", ->
        scopes = captureScopes()

        if UPDATE_SNAPSHOTS
          writeSnapshot(snapshotName, scopes)
          return

        hintText = "Run tests with UPDATE_SNAPSHOTS=1 to update."
        expectedSnapshot = readSnapshot(snapshotName)

        unless expectedSnapshot?
          throw new Error("Missing snapshot file: #{snapshotName}. #{hintText}")

        expect(scopes, "Scopes snapshot doesn't match. #{hintText}").toEqual(expectedSnapshot)

      it "should match #{target.expectedScope}", ->
        scopes = captureScopes()
        invalidEntries = Object.entries(scopes)
          .filter(([, scope]) -> typeof scope isnt 'string' or not target.expectedScope.test(scope))

        if invalidEntries.length > 0
          throw new Error("Entries don't match:\n" + formatEntriesList(invalidEntries))

      it "should not produce unknown symbols when expanding regexes", ->
        missingCoverage = new Map()
        rules = extractPatternRulesForScope(target.expectedScope)

        unless rules.length > 0
          throw new Error("No regex rules found for #{target.expectedScope}")

        rules.forEach (rule) ->
          expandedSymbols = null
          try
            expandedSymbols = expandRegexSymbols(rule.match)
          catch error
            throw new Error("Failed to expand regex for #{rule.name}: #{error.message}")

          expandedSymbols.forEach (symbol) ->
            matchedScope = scopeForSymbol(symbol)
            # Only keep symbols whose tokenized scope exactly matches this rule's scope (rule.name).
            unless matchedScope is rule.name
              return
              
            if knownSymbols.has(normalizeIdentifier(symbol))
              return

            entry = [symbol, rule.name]
            missingCoverage.set(JSON.stringify(entry), entry)

        if missingCoverage.size > 0
          throw new Error("""
            Regex expansion for rules matching #{target.expectedScope} produced symbols not found in #{target.knownSymbolsFile} file.
            #{formatEntriesList([...missingCoverage.values()])}
          """)
