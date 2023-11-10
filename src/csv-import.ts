import { StockTrade } from './stock-trade'
import { parse } from 'csv-parse/browser/esm'
import { fromCsvDateField } from './misc'

export const readTradesCsv = (s: string): Promise<StockTrade[]> => {
    const requiredHeaders = [
        'CurrencyPrimary',
        'FXRateToBase',
        'AssetClass',
        'Symbol',
        'DateTime',
        'Quantity',
        'TradePrice',
        'IBCommission',
        'IBCommissionCurrency',
        'Buy/Sell',
    ]

    return new Promise((resolve, reject) => {
        parse(
            s,
            {
                autoParse: false,
                columns: true,
            },
            (error, records, info) => {
                if (error) reject(error.message)
                try {
                    // @ts-ignore bad TS type (columns is missing on info)
                    const columnNames = info.columns.map(o => o.name)

                    for (const requiredHeader of requiredHeaders) {
                        if (!columnNames.includes(requiredHeader))
                            reject('CSV must include the following headers: ' + requiredHeaders.join(', '))
                    }

                    const trades: StockTrade[] = []
                    for (const record of records) {
                        if (record['AssetClass'] !== 'STK') continue

                        trades.push(
                            new StockTrade({
                                dateTime: fromCsvDateField(record['DateTime']),
                                symbol: record['Symbol'],
                                buyOrSell: record['Buy/Sell'],
                                currency: record['CurrencyPrimary'],
                                qty: Number(record['Quantity']),
                                price: Number(record['TradePrice']),
                                commission: Number(record['IBCommission']),
                                commissionCurrency: record['IBCommissionCurrency'],
                                fxRate: Number(record['FXRateToBase']),
                            })
                        )
                    }

                    resolve(trades)
                } catch (e: any) {
                    reject(e)
                }
            }
        )
    })
}

export const readCorpActionsCsv = (s: string): Promise<StockTrade[]> => {
    const requiredHeaders = [
        'FXRateToBase',
        'AssetClass',
        'Symbol',
        'Date/Time',
        'Type',
        'CurrencyPrimary',
        'Quantity',
        'Description',
    ]

    return new Promise((resolve, reject) => {
        parse(
            s,
            {
                autoParse: false,
                columns: true,
            },
            (error, records, info) => {
                if (error) reject(error.message)
                try {
                    // @ts-ignore bad TS type (columns is missing on info)
                    const columnNames = info.columns.map(o => o.name)

                    for (const requiredHeader of requiredHeaders) {
                        if (!columnNames.includes(requiredHeader))
                            reject('CSV must include the following headers: ' + requiredHeaders.join(', '))
                    }

                    const trades: StockTrade[] = []
                    for (const record of records) {
                        if (record['AssetClass'] !== 'STK') continue
                        if (!record['Description'].includes('SPLIT'))
                            reject(`Can't handle this type of corp action: ${record['Description']}`)

                        // Note: perhaps we can check 'Type' here but I have no other examples other than FS
                        // (which may mean stock split)

                        const qty = Number(record['Quantity'])

                        trades.push(
                            new StockTrade({
                                dateTime: fromCsvDateField(record['Date/Time']),
                                symbol: record['Symbol'],
                                buyOrSell: qty > 0 ? 'BUY' : 'SELL',
                                currency: record['CurrencyPrimary'],
                                qty,
                                price: 0,
                                commission: 0,
                                commissionCurrency: record['CurrencyPrimary'],
                                fxRate: Number(record['FXRateToBase']),
                            })
                        )
                    }
                    resolve(trades)
                } catch (e: any) {
                    reject(e)
                }
            }
        )
    })
}
