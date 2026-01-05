import { StockTrade } from '../stock-trade'
import { TickerAliases, resolveCanonicalSymbol } from '../ticker-alias'
import Gain from './gain'
import StockHolding from './stock-holding'

export type MatchRule = 'Same-day' | 'Bed & Breakfast' | 'Section 104 Holding'

export interface BuyMatch {
    rule: MatchRule
    qty: number
    costInBase: number
    buyTrade: StockTrade | undefined
}

export const matchGains = (trades: StockTrade[], aliases: TickerAliases = new Map()): Gain[] => {
    const holdings = new Map<string, StockHolding>()
    let gains: Gain[] = []

    // Pre-compute canonical symbols and group trades by canonical symbol for O(n) complexity
    const tradesByCanonical = new Map<string, StockTrade[]>()
    const tradeCanonicalMap = new Map<StockTrade, string>()

    for (const trade of trades) {
        const canonicalSymbol = resolveCanonicalSymbol(trade.symbol, aliases)
        tradeCanonicalMap.set(trade, canonicalSymbol)

        const existing = tradesByCanonical.get(canonicalSymbol) || []
        existing.push(trade)
        tradesByCanonical.set(canonicalSymbol, existing)
    }

    for (const trade of trades) {
        const canonicalSymbol = tradeCanonicalMap.get(trade)!

        let holding = holdings.get(canonicalSymbol)
        if (holding === undefined) {
            const tradesForSymbol = tradesByCanonical.get(canonicalSymbol)!
            holding = new StockHolding(canonicalSymbol, tradesForSymbol)
            holdings.set(canonicalSymbol, holding)
        }

        if (trade.isBuy) continue

        gains = gains.concat(holding.matchGains([trade]))
    }
    return gains
}
