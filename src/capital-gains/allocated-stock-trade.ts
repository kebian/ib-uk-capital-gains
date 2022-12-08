import { StockTrade } from '../stock-trade'

export class AllocatedStockTrade {
    private _allocated: number
    private _trade: StockTrade

    constructor(trade: StockTrade) {
        this._allocated = 0
        this._trade = trade
    }

    get allocated() {
        return this._allocated
    }

    get trade() {
        return this._trade
    }

    get qtyLeft() {
        return this._trade.qty - this._allocated
    }

    allocate(qty: number) {
        if (qty > this.qtyLeft) throw new Error(`Can't allocate ${qty} trades when only ${this.qtyLeft} left`)
        this._allocated += qty
    }

    netPrice(qty: number) {
        return (this._trade.netCash / this._trade.qty) * qty
    }

    netPriceInBase(qty: number) {
        return this.netPrice(qty) * this._trade.fxRate
    }
}

export default AllocatedStockTrade
