import { StockTrade } from './stock-trade'
import { parse } from 'csv-parse/browser/esm'
import { fromCsvDateField } from './misc'
import { TickerAliases, TickerRename } from './ticker-alias'

export interface CorpActionsResult {
    trades: StockTrade[]
    aliases: TickerAliases
}

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

export const readCorpActionsCsv = (s: string): Promise<CorpActionsResult> => {
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
                    const aliases: TickerAliases = new Map()

                    // Collect IC (CUSIP/ISIN Change) entries to pair them
                    interface ICEntry {
                        date: Date
                        symbol: string
                        qty: number
                    }
                    const icEntries: ICEntry[] = []

                    for (const record of records) {
                        if (record['AssetClass'] !== 'STK') continue

                        switch (record['Type']) {
                            case 'RS': // reverse stock split
                            case 'FS': {
                                // stock split
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
                                break
                            }

                            case 'TC': // Aquisition?
                                break

                            case 'DW': // Delisting
                                trades.push(
                                    new StockTrade({
                                        dateTime: fromCsvDateField(record['Date/Time']),
                                        symbol: record['Symbol'],
                                        buyOrSell: 'SELL',
                                        currency: record['CurrencyPrimary'],
                                        qty: Number(record['Quantity']),
                                        price: 0,
                                        commission: 0,
                                        commissionCurrency: record['CurrencyPrimary'],
                                        fxRate: Number(record['FXRateToBase']),
                                    })
                                )
                                break

                            case 'IC': {
                                // CUSIP/ISIN Change - ticker rename
                                const qty = Number(record['Quantity'])
                                icEntries.push({
                                    date: fromCsvDateField(record['Date/Time']),
                                    symbol: record['Symbol'],
                                    qty,
                                })
                                break
                            }

                            default:
                                reject(
                                    `Can't handle this type of corp action: ${record['Type']}: ${record['Description']}`
                                )
                        }
                    }

                    // Pair IC entries: negative qty = old symbol, positive qty = new symbol
                    // They share the same date/time and absolute quantity
                    const pairedDates = new Set<string>()
                    for (const entry of icEntries) {
                        if (entry.qty >= 0) continue // Skip positive entries, we start from negative

                        const dateKey = entry.date.getTime().toString()
                        if (pairedDates.has(dateKey)) continue

                        // Find matching positive entry with same date and absolute quantity
                        const match = icEntries.find(
                            e =>
                                e.qty > 0 &&
                                e.date.getTime() === entry.date.getTime() &&
                                Math.abs(e.qty) === Math.abs(entry.qty)
                        )

                        if (match) {
                            pairedDates.add(dateKey)
                            const oldSymbol = entry.symbol
                            const newSymbol = match.symbol

                            const rename: TickerRename = {
                                date: entry.date,
                                newSymbol,
                            }

                            const existing = aliases.get(oldSymbol) || []
                            existing.push(rename)
                            existing.sort((a, b) => a.date.getTime() - b.date.getTime())
                            aliases.set(oldSymbol, existing)
                        }
                    }

                    resolve({ trades, aliases })
                } catch (e: any) {
                    reject(e)
                }
            }
        )
    })
}
