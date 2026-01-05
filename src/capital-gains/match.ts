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

    // Helper to get canonical symbol for a trade
    const getCanonical = (trade: StockTrade) => resolveCanonicalSymbol(trade.symbol, aliases)

    for (const trade of trades) {
        const canonicalSymbol = getCanonical(trade)

        let holding = holdings.get(canonicalSymbol)
        if (holding === undefined) {
            // Filter all trades that resolve to this canonical symbol
            const tradesForSymbol = trades.filter(t => getCanonical(t) === canonicalSymbol)
            holding = new StockHolding(canonicalSymbol, tradesForSymbol)
            holdings.set(canonicalSymbol, holding)
        }

        if (trade.isBuy) continue

        gains = gains.concat(holding.matchGains([trade]))
    }
    return gains
}
