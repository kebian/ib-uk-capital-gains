import React from 'react'
import Gain from './gain'
import { TickerAliases, resolveDisplaySymbol, resolveCanonicalSymbol } from '../ticker-alias'

interface GainProps {
    gain: Gain
    aliases: TickerAliases
    asOfDate: Date
}

export const GainDetail = (props: GainProps) => {
    const { gain, aliases, asOfDate } = props
    const canonicalSymbol = resolveCanonicalSymbol(gain.trade.symbol, aliases)
    const displaySymbol = resolveDisplaySymbol(canonicalSymbol, asOfDate, aliases)
    const priceDecimals = 5
    const stockDecimals = 4
    const formatDate = (date: Date) =>
        date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })

    const formatQty = (qty: number) => {
        if (qty === Math.floor(qty)) return qty
        return qty.toFixed(stockDecimals)
    }

    return (
        <React.Fragment>
            {gain.buyMatches.map((buy, index) => (
                <React.Fragment key={index}>
                    {index === 0 && (
                        <tr className="border-t border-solid">
                            <td>{formatDate(gain.trade.dateTime)}</td>
                            <td>{displaySymbol}</td>
                            <td className="text-right">{formatQty(gain.trade.qty)}</td>
                            <td className="text-center">
                                {buy.buyTrade !== undefined && formatDate(buy.buyTrade.dateTime)}
                            </td>
                            <td className="text-right">{formatQty(buy.qty)}</td>
                            <td className="text-center">{buy.rule}</td>
                            <td className="text-right">{buy.costInBase.toFixed(priceDecimals)}</td>
                            <td className="text-right">{gain.costInBase.toFixed(priceDecimals)}</td>
                            <td className="text-right">{gain.proceedsInBase.toFixed(priceDecimals)}</td>
                            <td className="text-right">{gain.profitInBase.toFixed(priceDecimals)}</td>
                        </tr>
                    )}
                    {index > 0 && (
                        <tr>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="text-center">
                                {buy.buyTrade !== undefined && formatDate(buy.buyTrade.dateTime)}
                            </td>
                            <td className="text-right">{formatQty(buy.qty)}</td>
                            <td className="text-center">{buy.rule}</td>
                            <td className="text-right">{buy.costInBase.toFixed(priceDecimals)}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    )}
                </React.Fragment>
            ))}
        </React.Fragment>
    )
}

export default GainDetail
