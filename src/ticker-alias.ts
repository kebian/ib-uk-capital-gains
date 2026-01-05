export interface TickerRename {
    date: Date
    newSymbol: string
}

interface SerializedTickerRename {
    date: number
    newSymbol: string
}

export type TickerAliases = Map<string, TickerRename[]>

type SerializedTickerAliases = Record<string, SerializedTickerRename[]>

/**
 * Resolves a symbol to its canonical (original) symbol by checking if this symbol
 * is the result of a rename. Follows the chain back to the root.
 */
export const resolveCanonicalSymbol = (symbol: string, aliases: TickerAliases): string => {
    // Check if this symbol appears as a newSymbol in any alias chain
    for (const [originalSymbol, renames] of aliases) {
        for (const rename of renames) {
            if (rename.newSymbol === symbol) {
                // Found it - this symbol was renamed from originalSymbol
                // Recursively resolve in case originalSymbol is also a rename target
                return resolveCanonicalSymbol(originalSymbol, aliases)
            }
        }
    }
    // No rename found - this is the canonical symbol
    return symbol
}

/**
 * Resolves what symbol to display for a given canonical symbol at a specific date.
 * Walks forward through the rename chain to find the latest name as of that date.
 */
export const resolveDisplaySymbol = (canonicalSymbol: string, date: Date, aliases: TickerAliases): string => {
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
        return resolveDisplaySymbol(displaySymbol, date, aliases)
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
    const obj: SerializedTickerAliases = JSON.parse(json)
    const aliases: TickerAliases = new Map()

    for (const [symbol, renames] of Object.entries(obj)) {
        aliases.set(
            symbol,
            renames.map(r => ({
                date: new Date(r.date),
                newSymbol: r.newSymbol,
            }))
        )
    }

    return aliases
}
