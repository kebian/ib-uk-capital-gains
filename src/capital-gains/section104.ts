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
        // Don't filter by symbol - the caller (StockHolding) already filters by canonical symbol,
        // and trades may have different symbols due to ticker renames (IC, RS, FS corporate actions)
        this._allocatedTrades = trades.filter(t => t.trade.buyOrSell === 'BUY')

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
     * Allocates stock inside of _allocatedTrades to stop it reappearing later
     * @param qty
     */
    private allocateStockTrades(qty: number) {
        let qtyLeft = qty
        for (const t of this._allocatedTrades) {
            const qtyToAllocate = Math.min(t.qtyLeft, qtyLeft)
            t.allocate(qtyToAllocate)
            qtyLeft -= qtyToAllocate
            if (qtyLeft === 0) break
        }
        if (qtyLeft > 0) throw new Error(`Still have ${qtyLeft} stock to allocate for ${this._symbol}`)
    }

    /**
     * Allocate qty shares from the pool
     * @param qty Quantity to allocate
     * @returns the net price in base currency
     */
    allocate(qty: number): number {
        if (qty > this._qty)
            throw new ImportError(
                `Tried to allocate ${qty} ${this.symbol} stock from Section 104 holding but only ${this._qty} left. ` +
                    `Have you imported all trades AND corporate actions? ` +
                    `Corporate actions (ticker renames, stock splits) must be imported to link trades across symbol changes.`
            )
        const costInBase = (this._totalCostInBase / this._qty) * qty
        this._totalCostInBase -= costInBase
        this._qty -= qty
        this.allocateStockTrades(qty)
        return costInBase
    }
}
