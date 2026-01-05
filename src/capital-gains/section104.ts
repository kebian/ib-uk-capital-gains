import AllocatedStockTrade from './allocated-stock-trade'
import { ImportError } from '../errors'

export class Section104 {
    private _symbol: string
    private _allocatedTrades: AllocatedStockTrade[]
    private _qty: number
    private _totalCostInBase: number
    private _consumedByReorg: Set<AllocatedStockTrade>

    constructor(symbol: string, trades: AllocatedStockTrade[]) {
        this._symbol = symbol
        this._qty = 0
        this._totalCostInBase = 0
        this._consumedByReorg = new Set()
        // Don't filter by symbol - the caller (StockHolding) already filters by canonical symbol,
        // and trades may have different symbols due to ticker renames (IC, RS, FS corporate actions)
        this._allocatedTrades = trades.filter(t => t.trade.buyOrSell === 'BUY')

        // Sort by date for chronological processing
        const sortedTrades = [...this._allocatedTrades].sort(
            (a, b) => a.trade.dateTime.getTime() - b.trade.dateTime.getTime()
        )

        // Find all reorganization buys (from RS/FS corporate actions)
        // These represent shares after a stock split and should inherit cost basis
        // from all shares that existed before the reorganization
        const reorgBuys = sortedTrades.filter(t => t.trade.isReorganizationBuy)

        for (const reorgBuy of reorgBuys) {
            const reorgDate = reorgBuy.trade.dateTime

            // Calculate the cost basis of all unconsumed shares bought before this reorganization
            let priorCost = 0
            for (const trade of sortedTrades) {
                if (trade.trade.dateTime >= reorgDate) continue
                if (this._consumedByReorg.has(trade)) continue
                if (trade.trade.isReorganizationBuy) continue // Don't double-count prior reorg buys
                if (trade.qtyLeft === 0) continue

                priorCost += trade.netPriceInBase(trade.qtyLeft)
                this._consumedByReorg.add(trade)
            }

            // The reorganization buy inherits the entire prior cost basis
            // Store this for later use when calculating the pool
            ;(reorgBuy as any)._inheritedCostInBase = priorCost
        }

        // Now calculate the pool totals
        for (const allocatedTrade of this._allocatedTrades) {
            if (allocatedTrade.qtyLeft === 0) continue

            // Skip trades that were consumed by a reorganization
            if (this._consumedByReorg.has(allocatedTrade)) continue

            if (allocatedTrade.trade.isReorganizationBuy) {
                // Use the inherited cost basis instead of the trade's zero cost
                const inheritedCost = (allocatedTrade as any)._inheritedCostInBase || 0
                this._totalCostInBase += inheritedCost
            } else {
                this._totalCostInBase += allocatedTrade.netPriceInBase(allocatedTrade.qtyLeft)
            }
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
            // Skip trades that were consumed by a reorganization
            if (this._consumedByReorg.has(t)) continue

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
