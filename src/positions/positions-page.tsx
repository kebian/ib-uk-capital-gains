import React, { useEffect, useState } from 'react'
import { StockTrade } from '../stock-trade'
import { Position } from './position'
import { TickerAliases, resolveCanonicalSymbol, resolveDisplaySymbol } from '../ticker-alias'

type Props = {
    trades: StockTrade[]
    aliases: TickerAliases
    asOfDate: Date
}

export const PositionsPage = (props: Props) => {
    const { trades, aliases, asOfDate } = props
    const [positions, setPositions] = useState<Map<string, Position>>(new Map())

    const sortedPositions = Array.from(positions.values())
        .filter(a => a.quantity > 0)
        .sort((a, b) => {
            if (a.symbol > b.symbol) return 1
            if (b.symbol > a.symbol) return -1
            return 0
        })

    useEffect(() => {
        // Pre-compute canonical symbols and group trades for O(n) complexity
        const tradesByCanonical = new Map<string, StockTrade[]>()
        for (const trade of trades) {
            const canonicalSymbol = resolveCanonicalSymbol(trade.symbol, aliases)
            const existing = tradesByCanonical.get(canonicalSymbol) || []
            existing.push(trade)
            tradesByCanonical.set(canonicalSymbol, existing)
        }

        const newPositions = new Map<string, Position>()
        for (const [canonicalSymbol, tradesForSymbol] of tradesByCanonical) {
            newPositions.set(canonicalSymbol, new Position(canonicalSymbol, tradesForSymbol))
        }
        setPositions(newPositions)
    }, [trades, aliases])

    return (
        <div>
            <h2 className="hidden print:block">Positions</h2>
            <table className="w-full" cellPadding={1}>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th className="text-right">Quantity</th>
                        <th className="text-right">Avg Cost</th>
                        <th className="text-right">Cost Basis</th>
                        <th className="text-right">Currency</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {sortedPositions.map(position => (
                        <tr key={position.symbol}>
                            <td>{resolveDisplaySymbol(position.symbol, asOfDate, aliases)}</td>
                            <td className="text-right">{position.quantity}</td>
                            <td className="text-right">{position.avgPrice.toFixed(2)}</td>
                            <td className="text-right">{position.costBasis.toFixed(2)}</td>
                            <td className="text-right">{position.currency}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
