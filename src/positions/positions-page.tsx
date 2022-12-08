import React, { useEffect, useState } from 'react'
import { StockTrade } from '../stock-trade'
import { Position } from './position'

type Props = {
    trades: StockTrade[]
}

export const PositionsPage = (props: Props) => {
    const { trades } = props
    const [positions, setPositions] = useState<Map<string, Position>>(new Map())

    const sortedPositions = Array.from(positions.values())
        .filter(a => a.quantity > 0)
        .sort((a, b) => {
            if (a.symbol > b.symbol) return 1
            if (b.symbol > a.symbol) return -1
            return 0
        })

    useEffect(() => {
        const newPositions = new Map<string, Position>()
        for (const trade of trades) {
            if (newPositions.has(trade.symbol)) continue
            newPositions.set(trade.symbol, new Position(trade.symbol, trades))
        }
        setPositions(newPositions)
    }, [trades])

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
                            <td>{position.symbol}</td>
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
