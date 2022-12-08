import { BuyMatch } from './match'
import { StockTrade } from '../stock-trade'

export class Gain {
    private _sellTrade: StockTrade
    private _buyMatches: BuyMatch[]

    constructor(sell: StockTrade, buys: BuyMatch[]) {
        this._sellTrade = sell
        this._buyMatches = [...buys]
    }

    get costInBase() {
        let total = 0
        for (const buy of this._buyMatches) total += buy.costInBase
        return total
    }

    get proceedsInBase() {
        return this._sellTrade.netCashInBase
    }

    get profitInBase() {
        return this.proceedsInBase - this.costInBase
    }

    get trade() {
        return this._sellTrade
    }

    get buyMatches() {
        return this._buyMatches
    }
}

export default Gain
