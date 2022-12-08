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
    const seen = new Map<string, StockTrade>()
    const dedupes: StockTrade[] = []

    for (const trade of trades) {
        if (seen.has(trade.hash)) continue
        dedupes.push(trade)
        seen.set(trade.hash, trade)
    }

    return dedupes
}

export const fileListToArray = (fileList: FileList): File[] => {
    const files: File[] = []
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList.item(i)
        if (file !== null) files.push(file)
    }
    return files
}
