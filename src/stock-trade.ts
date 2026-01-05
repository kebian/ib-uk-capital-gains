import md5 from 'md5'

export interface StockTradeFields {
    dateTime: Date
    symbol: string
    buyOrSell: 'BUY' | 'SELL'
    currency: string
    qty: number
    price: number
    commission: number
    commissionCurrency: string
    fxRate: number
    /**
     * If true, this trade is part of a stock reorganization (e.g., reverse split with symbol change)
     * and should not be treated as a capital gains disposal.
     */
    isReorganization?: boolean
}

interface SerializedStockTrade extends Omit<StockTradeFields, 'dateTime'> {
    dateTime: number
}

export class StockTrade implements StockTradeFields {
    dateTime!: Date
    symbol!: string
    buyOrSell!: 'BUY' | 'SELL'
    currency!: string
    qty!: number
    price!: number
    commission!: number
    commissionCurrency!: string
    fxRate!: number
    isReorganization?: boolean
    private _hash: string

    constructor(fields: StockTradeFields) {
        Object.assign(this, fields)
        if (this.currency !== this.commissionCurrency)
            throw new Error('Commission currency is not same currency as market currency')
        this.commission = Math.abs(this.commission)
        this.qty = Math.abs(this.qty)

        if (this.buyOrSell !== 'BUY' && this.buyOrSell !== 'SELL') throw new Error(`Buy/Sell was ${this.buyOrSell}`)

        this._hash = this.makeHash()
    }

    serialize(): SerializedStockTrade {
        const result: any = {}
        const ignoredKeys = ['_hash']
        for (const [k, v] of Object.entries(this)) {
            if (ignoredKeys.includes(k)) continue
            if (k === 'dateTime') result[k] = (v as Date).getTime()
            else result[k] = v
        }
        return result
    }

    static deserialize(obj: SerializedStockTrade): StockTrade {
        return new StockTrade({
            ...obj,
            dateTime: new Date(obj.dateTime),
        })
    }

    private makeHash(): string {
        return md5(
            JSON.stringify([
                this.dateTime.toISOString(),
                this.symbol,
                this.buyOrSell,
                this.currency,
                this.price,
                this.qty,
                this.commission,
                this.commissionCurrency,
            ])
        )
    }

    get netCash() {
        return this.qty * this.price + (this.buyOrSell === 'BUY' ? this.commission : -this.commission)
    }

    get netCashInBase() {
        return this.netCash * this.fxRate
    }

    get hash() {
        return this._hash
    }

    get isBuy() {
        return this.buyOrSell === 'BUY'
    }

    get isSell() {
        return this.buyOrSell === 'SELL'
    }
}
