import AllocatedStockTrade from './allocated-stock-trade'
import Gain from './gain'
import { BuyMatch, MatchRule } from './match'
import { Section104 } from './section104'
import { StockTrade } from '../stock-trade'

type BuyMatchCallback = (match: StockTrade) => BuyMatch[]

export class StockHolding {
    private _allocatedTrades: AllocatedStockTrade[]
    private _symbol: string

    constructor(symbol: string, trades: StockTrade[]) {
        this._symbol = symbol
        this._allocatedTrades = trades
            .filter(t => t.symbol === symbol && t.buyOrSell === 'BUY')
            .map(t => new AllocatedStockTrade(t))
    }

    private isSameDay(a: StockTrade, b: StockTrade) {
        const isSameDate = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

        return isSameDate(a.dateTime, b.dateTime)
    }

    private isWithin30Days(buyTrade: StockTrade, sellTrade: StockTrade) {
        const buy = buyTrade.dateTime.getTime()
        const sell = sellTrade.dateTime.getTime()
        const days30 = 1000 * 60 * 60 * 24 * 30
        const diff = sell - buy
        return diff >= 0 && diff < days30
    }

    private allocateFrom(allocTrade: AllocatedStockTrade, qty: number, rule: MatchRule, matches: BuyMatch[]) {
        if (allocTrade.qtyLeft === 0) return 0
        const qtyAllocated = Math.min(allocTrade.qtyLeft, qty)
        allocTrade.allocate(qtyAllocated)
        matches.push({
            rule,
            qty: qtyAllocated,
            costInBase: allocTrade.netPriceInBase(qtyAllocated),
            buyTrade: allocTrade.trade,
        })

        return qtyAllocated
    }

    private match30Day(trade: StockTrade): BuyMatch[] {
        const matches: BuyMatch[] = []
        let qtyLeft = trade.qty
        for (const buy of this._allocatedTrades) {
            if (!this.isWithin30Days(buy.trade, trade)) continue

            const qtyAllocated = this.allocateFrom(buy, qtyLeft, 'Bed & Breakfast', matches)
            qtyLeft -= qtyAllocated

            if (qtyLeft === 0) break
        }
        return matches
    }

    private matchSameDay(trade: StockTrade): BuyMatch[] {
        const matches: BuyMatch[] = []
        let qtyLeft = trade.qty
        for (const buy of this._allocatedTrades) {
            if (!this.isSameDay(buy.trade, trade)) continue

            const qtyAllocated = this.allocateFrom(buy, qtyLeft, 'Same-day', matches)
            qtyLeft -= qtyAllocated

            if (qtyLeft === 0) break
        }
        return matches
    }

    /**
     * Finds matching buy trades for sales, including costs.
     * HMRC rules state that stocks must be first matched using the same-day rule,
     * then the 30 day "bed & breakfast" rule before matching against the 104 holding rule
     * @param sellTrades
     */

    matchGains(sellTrades: StockTrade[]): Gain[] {
        let sales = sellTrades.filter(t => t.buyOrSell === 'SELL' && t.symbol === this._symbol)
        let gains: Gain[] = []

        const doMatch = (callback: BuyMatchCallback) => {
            sales = sales.filter(sale => {
                const thisMatch = callback(sale)
                if (thisMatch.length) {
                    gains.push(new Gain(sale, thisMatch))
                    return false
                }
                return true
            })
        }

        doMatch(sale => this.matchSameDay(sale))
        doMatch(sale => this.match30Day(sale))

        const section104 = new Section104(this._symbol, this._allocatedTrades)

        for (const sale of sales) {
            const buyMatch: BuyMatch = {
                rule: 'Section 104 Holding',
                costInBase: section104.allocate(sale.qty),
                qty: sale.qty,
                buyTrade: undefined,
            }
            gains.push(new Gain(sale, [buyMatch]))
        }

        return gains
    }
}

export default StockHolding
