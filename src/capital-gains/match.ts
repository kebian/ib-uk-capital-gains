import { StockTrade } from '../stock-trade'
import Gain from './gain'
import StockHolding from './stock-holding'

export type MatchRule = 'Same-day' | 'Bed & Breakfast' | 'Section 104 Holding'

export interface BuyMatch {
    rule: MatchRule
    qty: number
    costInBase: number
    buyTrade: StockTrade | undefined
}

export const matchGains = (trades: StockTrade[]): Gain[] => {
    const holdings = new Map<string, StockHolding>()
    let gains: Gain[] = []

    for (const trade of trades) {
        let holding = holdings.get(trade.symbol)
        if (holding === undefined) {
            holding = new StockHolding(trade.symbol, trades)
            holdings.set(trade.symbol, holding)
        }

        if (trade.isBuy) continue

        gains = gains.concat(holding.matchGains([trade])).filter(g => g.trade.price > 0)
    }
    return gains
}
