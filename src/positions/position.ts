import { StockTrade } from '../stock-trade'

export class Position {
    private _symbol: string
    private _totalBought: number
    private _totalSold: number
    private _totalCost: number
    private _currency: string

    /**
     * @param symbol The canonical symbol for this position
     * @param trades All trades for this position (already filtered by caller)
     */
    constructor(symbol: string, trades: StockTrade[]) {
        this._symbol = symbol
        this._totalBought = 0
        this._totalSold = 0
        this._totalCost = 0
        this._currency = 'USD'

        this.sumFromTrades(trades)
    }

    private sumFromTrades(trades: StockTrade[]) {
        if (trades.length > 0) this._currency = trades[0].currency

        for (const trade of trades) {
            if (trade.isBuy) {
                this._totalBought += trade.qty
                this._totalCost += trade.netCash
            } else {
                this._totalSold += trade.qty
            }
        }
    }

    get symbol() {
        return this._symbol
    }

    get quantity() {
        return this._totalBought - this._totalSold
    }

    get avgPrice() {
        return this._totalCost / this._totalBought
    }

    get costBasis() {
        return this.avgPrice * this.quantity
    }

    get currency() {
        return this._currency
    }
}
