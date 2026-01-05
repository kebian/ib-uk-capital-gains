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
        'TradeID',
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
                                tradeId: record['TradeID'],
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
        'ActionID',
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

                    // Collect entries that may need pairing (IC and RS/FS with symbol changes)
                    interface PairableEntry {
                        date: Date
                        symbol: string
                        qty: number
                        type: 'IC' | 'RS' | 'FS'
                        tradeIndex?: number // Index into trades array for RS/FS entries
                    }
                    const icEntries: PairableEntry[] = []
                    const splitEntries: PairableEntry[] = []

                    for (const record of records) {
                        if (record['AssetClass'] !== 'STK') continue

                        switch (record['Type']) {
                            case 'RS': // reverse stock split
                            case 'FS': {
                                // stock split
                                const qty = Number(record['Quantity'])
                                const date = fromCsvDateField(record['Date/Time'])
                                const symbol = record['Symbol']
                                // ActionID is shared between paired entries (e.g., +40 MKFG and -400 MKFG.OLD),
                                // so include symbol to make tradeId unique
                                const tradeId = `${record['ActionID']}-${symbol}`

                                const tradeIndex = trades.length
                                trades.push(
                                    new StockTrade({
                                        dateTime: date,
                                        symbol,
                                        buyOrSell: qty > 0 ? 'BUY' : 'SELL',
                                        currency: record['CurrencyPrimary'],
                                        qty,
                                        price: 0,
                                        commission: 0,
                                        commissionCurrency: record['CurrencyPrimary'],
                                        fxRate: Number(record['FXRateToBase']),
                                        tradeId,
                                    })
                                )

                                // Collect for potential pairing (symbol may change during split)
                                splitEntries.push({ date, symbol, qty, type: record['Type'] as 'RS' | 'FS', tradeIndex })
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
                                        tradeId: record['ActionID'],
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
                                    type: 'IC',
                                })
                                break
                            }

                            default:
                                reject(
                                    `Can't handle this type of corp action: ${record['Type']}: ${record['Description']}`
                                )
                        }
                    }

                    // Helper to add an alias
                    const addAlias = (oldSymbol: string, newSymbol: string, date: Date) => {
                        if (oldSymbol === newSymbol) return // No alias needed if symbols are the same

                        const rename: TickerRename = { date, newSymbol }
                        const existing = aliases.get(oldSymbol) || []
                        existing.push(rename)
                        existing.sort((a, b) => a.date.getTime() - b.date.getTime())
                        aliases.set(oldSymbol, existing)
                    }

                    // Pair IC entries: negative qty = old symbol, positive qty = new symbol
                    // They share the same date/time and absolute quantity
                    // Track paired indices to handle multiple renames on the same date
                    const pairedNegativeIndices = new Set<number>()
                    const pairedPositiveIndices = new Set<number>()
                    for (let i = 0; i < icEntries.length; i++) {
                        const entry = icEntries[i]
                        if (entry.qty >= 0) continue // Skip positive entries, we start from negative
                        if (pairedNegativeIndices.has(i)) continue

                        // Find matching positive entry with same date and absolute quantity
                        const matchIndex = icEntries.findIndex(
                            (e, idx) =>
                                e.qty > 0 &&
                                !pairedPositiveIndices.has(idx) &&
                                e.date.getTime() === entry.date.getTime() &&
                                Math.abs(e.qty) === Math.abs(entry.qty)
                        )

                        if (matchIndex !== -1) {
                            pairedNegativeIndices.add(i)
                            pairedPositiveIndices.add(matchIndex)

                            const match = icEntries[matchIndex]
                            addAlias(entry.symbol, match.symbol, entry.date)
                        }
                    }

                    // Pair RS/FS (split) entries when symbols differ
                    // e.g., MKFG +40 and MKFG.OLD -400 on same date means MKFG.OLD -> MKFG
                    const pairedSplitNegIndices = new Set<number>()
                    const pairedSplitPosIndices = new Set<number>()
                    for (let i = 0; i < splitEntries.length; i++) {
                        const entry = splitEntries[i]
                        if (entry.qty >= 0) continue // Start from negative (old shares being removed)
                        if (pairedSplitNegIndices.has(i)) continue

                        // Find matching positive entry with same date and same type
                        const matchIndex = splitEntries.findIndex(
                            (e, idx) =>
                                e.qty > 0 &&
                                !pairedSplitPosIndices.has(idx) &&
                                e.date.getTime() === entry.date.getTime() &&
                                e.type === entry.type
                        )

                        if (matchIndex !== -1) {
                            pairedSplitNegIndices.add(i)
                            pairedSplitPosIndices.add(matchIndex)

                            const match = splitEntries[matchIndex]
                            // If symbols differ, the old symbol (negative qty) aliases to new symbol (positive qty)
                            addAlias(entry.symbol, match.symbol, entry.date)

                            // When symbols differ, mark both trades appropriately:
                            // - SELL side (entry): isReorganization=true - skip for capital gains
                            // - BUY side (match): isReorganizationBuy=true - include in Section 104 pool
                            if (entry.symbol !== match.symbol) {
                                if (entry.tradeIndex !== undefined) {
                                    trades[entry.tradeIndex].isReorganization = true
                                }
                                if (match.tradeIndex !== undefined) {
                                    trades[match.tradeIndex].isReorganizationBuy = true
                                }
                            }
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
