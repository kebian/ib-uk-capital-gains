export interface TickerRename {
    date: Date
    newSymbol: string
}

interface SerializedTickerRename {
    date: number
    newSymbol: string
}

/**
 * Map from a canonical (original) ticker symbol to its sequence of renames.
 *
 * Keys are always the canonical/original symbols, not any of the renamed symbols.
 * Renamed symbols only appear as `newSymbol` values inside the rename arrays.
 *
 * For chained renames (A→B→C), each intermediate symbol that was itself renamed
 * from another symbol will also appear as a key with its own rename history.
 */
export type TickerAliases = Map<string, TickerRename[]>

type SerializedTickerAliases = Record<string, SerializedTickerRename[]>

/**
 * Resolves a symbol to its canonical (original) symbol by checking if this symbol
 * is the result of a rename. Follows the chain back to the root.
 * Uses visited set to prevent infinite recursion from circular rename chains.
 */
export const resolveCanonicalSymbol = (
    symbol: string,
    aliases: TickerAliases,
    visited: Set<string> = new Set()
): string => {
    if (visited.has(symbol)) {
        // Circular reference detected, return current symbol to break the cycle
        return symbol
    }
    visited.add(symbol)

    // First, check if this symbol has aliases (i.e., it's an old symbol that was renamed)
    // If so, follow the chain forward to get to the "current" symbol, then resolve that
    const ownAliases = aliases.get(symbol)
    if (ownAliases && ownAliases.length > 0) {
        // This symbol was renamed to something else - get the latest rename
        const latestRename = ownAliases[ownAliases.length - 1]
        // Recursively resolve the new symbol to find the canonical
        return resolveCanonicalSymbol(latestRename.newSymbol, aliases, visited)
    }

    // Check if this symbol appears as a newSymbol in any alias chain
    for (const [originalSymbol, renames] of aliases) {
        for (const rename of renames) {
            if (rename.newSymbol === symbol) {
                // Found it - this symbol was renamed from originalSymbol
                // Recursively resolve in case originalSymbol is also a rename target
                return resolveCanonicalSymbol(originalSymbol, aliases, visited)
            }
        }
    }
    // No rename found - this is the canonical symbol
    return symbol
}

/**
 * Resolves what symbol to display for a given canonical symbol at a specific date.
 * Walks forward through the rename chain to find the latest name as of that date.
 * Uses visited set to prevent infinite recursion from circular rename chains.
 */
export const resolveDisplaySymbol = (
    canonicalSymbol: string,
    date: Date,
    aliases: TickerAliases,
    visited: Set<string> = new Set()
): string => {
    if (visited.has(canonicalSymbol)) {
        // Circular reference detected, return current symbol to break the cycle
        return canonicalSymbol
    }
    visited.add(canonicalSymbol)

    const renames = aliases.get(canonicalSymbol)
    if (!renames || renames.length === 0) {
        return canonicalSymbol
    }

    // Renames should be in date order, find the latest rename before/on the given date
    let displaySymbol = canonicalSymbol
    for (const rename of renames) {
        if (rename.date.getTime() <= date.getTime()) {
            displaySymbol = rename.newSymbol
        } else {
            break
        }
    }

    // Check if the display symbol itself has been renamed (chained renames)
    if (displaySymbol !== canonicalSymbol) {
        return resolveDisplaySymbol(displaySymbol, date, aliases, visited)
    }

    return displaySymbol
}

/**
 * Merges new aliases into existing aliases, avoiding duplicates.
 */
export const mergeAliases = (existing: TickerAliases, newAliases: TickerAliases): TickerAliases => {
    const merged = new Map(existing)

    for (const [symbol, renames] of newAliases) {
        const existingRenames = merged.get(symbol) || []
        const mergedRenames = [...existingRenames]

        for (const rename of renames) {
            const isDuplicate = existingRenames.some(
                r => r.date.getTime() === rename.date.getTime() && r.newSymbol === rename.newSymbol
            )
            if (!isDuplicate) {
                mergedRenames.push(rename)
            }
        }

        // Sort by date
        mergedRenames.sort((a, b) => a.date.getTime() - b.date.getTime())
        merged.set(symbol, mergedRenames)
    }

    return merged
}

export const serializeAliases = (aliases: TickerAliases): string => {
    const obj: SerializedTickerAliases = {}
    for (const [symbol, renames] of aliases) {
        obj[symbol] = renames.map(r => ({
            date: r.date.getTime(),
            newSymbol: r.newSymbol,
        }))
    }
    return JSON.stringify(obj)
}

export const deserializeAliases = (json: string): TickerAliases => {
    const aliases: TickerAliases = new Map()

    try {
        const obj = JSON.parse(json)

        if (typeof obj !== 'object' || obj === null) {
            console.error('Invalid ticker aliases data: expected object')
            return aliases
        }

        for (const [symbol, renames] of Object.entries(obj)) {
            if (!Array.isArray(renames)) {
                console.error(`Invalid ticker aliases data: expected array for symbol ${symbol}`)
                continue
            }

            aliases.set(
                symbol,
                renames
                    .filter(r => typeof r === 'object' && r !== null && 'date' in r && 'newSymbol' in r)
                    .map(r => ({
                        date: new Date((r as SerializedTickerRename).date),
                        newSymbol: (r as SerializedTickerRename).newSymbol,
                    }))
            )
        }
    } catch (e) {
        console.error('Failed to parse ticker aliases JSON:', e)
    }

    return aliases
}
