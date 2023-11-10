import AllocatedStockTrade from './allocated-stock-trade'
import { ImportError } from '../errors'

export class Section104 {
    private _symbol: string
    private _allocatedTrades: AllocatedStockTrade[]
    private _qty: number
    private _totalCostInBase: number

    constructor(symbol: string, trades: AllocatedStockTrade[]) {
        this._symbol = symbol
        this._qty = 0
        this._totalCostInBase = 0
        this._allocatedTrades = trades.filter(t => t.trade.symbol === symbol && t.trade.buyOrSell === 'BUY')

        for (const allocatedTrade of this._allocatedTrades) {
            if (allocatedTrade.qtyLeft === 0) continue

            this._totalCostInBase += allocatedTrade.netPriceInBase(allocatedTrade.qtyLeft)
            this._qty += allocatedTrade.qtyLeft
        }
    }

    get symbol() {
        return this._symbol
    }

    /**
     * Allocate qty shares from the pool
     * @param qty Quantity to allocate
     * @returns the net price in base currency
     */
    allocate(qty: number): number {
        if (qty > this._qty)
            throw new ImportError(
                `Tried to allocate ${qty} stock from Section 104 holding but only ${this._qty} left.  Probably need more data importing.`
            )
        const costInBase = (this._totalCostInBase / this._qty) * qty
        this._totalCostInBase -= costInBase
        const poolQtyBefore = this._qty
        this._qty -= qty
        console.log(
            `Allocated Section 104 ${qty} ${this.symbol} from pool of ${poolQtyBefore}.  Pool now has ${this._qty}.`
        )
        return costInBase
    }
}
