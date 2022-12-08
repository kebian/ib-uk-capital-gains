import React from 'react'
import { ChangeEvent, MouseEvent, useEffect, useRef, useState } from 'react'
import { StockTrade } from './stock-trade'
import Gain from './capital-gains/gain'
import { dedupeTrades, fileListToArray, FinancialYear, isDateInYear } from './misc'
import { matchGains } from './capital-gains/match'
import { CapitalGains } from './capital-gains/capital-gains'
import { PositionsPage } from './positions/positions-page'
import { readCorpActionsCsv, readTradesCsv } from './csv-import'

const financialYears: FinancialYear[] = [
    {
        label: '2020-2021',
        start: new Date(Date.UTC(2020, 3, 6, 0, 0, 0)),
        end: new Date(Date.UTC(2021, 3, 5, 23, 59, 59)),
    },
    {
        label: '2021-2022',
        start: new Date(Date.UTC(2021, 3, 6, 0, 0, 0)),
        end: new Date(Date.UTC(2022, 3, 5, 23, 59, 59)),
    },
    {
        label: '2022-2023',
        start: new Date(Date.UTC(2022, 3, 6, 0, 0, 0)),
        end: new Date(Date.UTC(2023, 3, 5, 23, 59, 59)),
    },
]

type Page = 'gains' | 'positions'
const localStorageVarName = 'ibukcgt-trades'

export interface AccountingProps {
    className?: string
}

export const Accounting = ({ ...otherProps }: AccountingProps) => {
    const [gains, setGains] = useState<Gain[]>([])
    const [trades, setTrades] = useState<StockTrade[]>([])
    const [yearIndex, setYearIndex] = useState<number>(0)
    const [page, setPage] = useState<Page>('gains')
    const isMounted = useRef<boolean>(false)
    const fileInputTradesRef = useRef<HTMLInputElement>(null)
    const fileInputCorpActionsRef = useRef<HTMLInputElement>(null)
    const year = financialYears[yearIndex]
    const positionTrades = trades.filter(trade => trade.dateTime.getTime() <= year.end.getTime())
    const handleCapitalGainsClick = (e: MouseEvent) => {
        setPage('gains')
        e.preventDefault()
    }
    const handlePositionsClick = (e: MouseEvent) => {
        setPage('positions')
        e.preventDefault()
    }

    useEffect(() => {
        const savedTradesJson = localStorage.getItem(localStorageVarName)

        if (savedTradesJson === null) {
            return
        }

        const tradesArray = JSON.parse(savedTradesJson) as any[]
        if (!Array.isArray(tradesArray)) throw new Error('Invalid data in local storge.  Trades is not an array.')

        const savedTrades: StockTrade[] = []
        for (const serialized of tradesArray) {
            const trade = StockTrade.deserialize(serialized)
            savedTrades.push(trade)
        }

        setTrades(savedTrades)
    }, [])

    useEffect(() => {
        if (!isMounted.current) return
        const serialized = JSON.stringify(trades.map(trade => trade.serialize()))
        localStorage.setItem(localStorageVarName, serialized)
    }, [trades])

    useEffect(() => {
        try {
            const newGains = matchGains(trades).filter(g => isDateInYear(g.trade.dateTime, year))
            setGains(newGains)
        } catch (e) {
            alert(e)
        }
    }, [trades, year])

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const handleTradeFilesChanged = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files === null) return

        let totalTrades = [...trades]
        for (const file of fileListToArray(e.target.files)) {
            try {
                const tradesFromFile = await readTradesCsv(await file.text())
                if (tradesFromFile.length === 0) continue

                totalTrades = totalTrades.concat(tradesFromFile)
            } catch (e: any) {
                alert(e)
            }
        }
        setTrades(dedupeTrades(totalTrades))
    }

    const handleCorpActionsChanged = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files === null) return

        let totalTrades = [...trades]
        for (const file of fileListToArray(e.target.files)) {
            try {
                const tradesFromFile = await readCorpActionsCsv(await file.text())
                if (tradesFromFile.length === 0) continue

                totalTrades = totalTrades.concat(tradesFromFile)
            } catch (e: any) {
                alert(e)
            }
        }
        setTrades(dedupeTrades(totalTrades))
    }

    const handleYearChanged = (e: ChangeEvent<HTMLSelectElement>) => {
        setYearIndex(Number(e.target.value))
    }

    const handleImportTradesClick = () => fileInputTradesRef.current?.click()
    const handleImportCorpActions = () => fileInputCorpActionsRef.current?.click()
    const handleClearDataClick = () => {
        if (window.confirm('Are you sure you wish to permanently remove this data?')) setTrades([])
    }

    return (
        <div {...otherProps}>
            <h2>Interactive Brokers UK {year.label}</h2>

            <div className="text-left mb-4 print:hidden flex justify-end">
                <input
                    ref={fileInputTradesRef}
                    type="file"
                    accept=".csv"
                    onChange={handleTradeFilesChanged}
                    className="hidden"
                    multiple
                />
                <input
                    ref={fileInputCorpActionsRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCorpActionsChanged}
                    className="hidden"
                    multiple
                />
                <button className="btn" onClick={handleImportTradesClick}>
                    Import Trades
                </button>
                <button className="btn" onClick={handleImportCorpActions}>
                    Import Corp Actions
                </button>
                <button className="btn" onClick={handleClearDataClick}>
                    Clear Data
                </button>
                <div className="grow"></div>
                <div className="">
                    <label>
                        Financial Year&nbsp;
                        <select value={yearIndex} onChange={handleYearChanged}>
                            {financialYears.map((date, index) => (
                                <option key={index} value={index}>
                                    {date.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
            <div>
                <nav className="print:hidden mb-4">
                    <ul className="flex space-x-1">
                        <li>
                            <a href="#" onClick={handleCapitalGainsClick}>
                                Capital Gains
                            </a>
                        </li>
                        <li>
                            <a href="#" onClick={handlePositionsClick}>
                                Positions
                            </a>
                        </li>
                    </ul>
                </nav>
                {page === 'gains' && <CapitalGains gains={gains} />}
                {page === 'positions' && <PositionsPage trades={positionTrades} />}
            </div>
        </div>
    )
}

export default Accounting
