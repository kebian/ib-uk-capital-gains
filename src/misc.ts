import { StockTrade } from './stock-trade'

export interface FinancialYear {
    label: string
    start: Date
    end: Date
}

const splitStringEvery = (s: string, count: number): string[] => {
    const len = s.length
    const results: string[] = []
    for (let i = 0; i + count <= len; i += count) results.push(s.substring(i, i + count))
    return results
}

export const isDateInYear = (date: Date, year: FinancialYear) => {
    const unixDate = date.getTime()
    return unixDate >= year.start.getTime() && unixDate <= year.end.getTime()
}

export const isDateBeforeYear = (date: Date, year: FinancialYear) => {
    const unixDate = date.getTime()
    return unixDate <= year.end.getTime()
}

export const fromCsvDateField = (s: string): Date => {
    const [day, month, rest] = s.split('/')
    const [year, time] = rest.split(';')
    const [hour, minute, seconds] = time.includes(':') ? time.split(':') : splitStringEvery(time, 2)

    const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(seconds))
    )

    if (!(date instanceof Date) || isNaN(date.valueOf()))
        throw new Error('Invalid date. Ensure date and times use the format DD/MM/YYYY;HH:mm:ss')

    return date
}

export const dedupeTrades = (trades: StockTrade[]): StockTrade[] => {
    // Deduplicate using TradeID-based hash. IB can have multiple fills with identical
    // parameters (same time, price, qty, commission) that are legitimately different trades,
    // but TradeID is always unique per trade.
    //
    // When duplicate trades are found, merge reorganization flags from the newer trade
    // into the existing one. This ensures that importing corp actions after trades
    // (or reloading from localStorage) properly marks reorganization trades.
    const tradesByHash = new Map<string, StockTrade>()
    for (const trade of trades) {
        const existing = tradesByHash.get(trade.hash)
        if (existing) {
            // Merge reorganization flags from the new trade into existing
            if (trade.isReorganization) existing.isReorganization = true
            if (trade.isReorganizationBuy) existing.isReorganizationBuy = true
        } else {
            tradesByHash.set(trade.hash, trade)
        }
    }
    return Array.from(tradesByHash.values()).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
}

export const fileListToArray = (fileList: FileList): File[] => {
    const files: File[] = []
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList.item(i)
        if (file !== null) files.push(file)
    }
    return files
}
