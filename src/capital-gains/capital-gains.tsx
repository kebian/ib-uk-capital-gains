import React from 'react'
import Gain from './gain'
import GainDetail from './gain-detail'
import Totals from './totals'
import { TickerAliases } from '../ticker-alias'

interface GainProps {
    gains: Gain[]
    aliases: TickerAliases
    asOfDate: Date
}

export const CapitalGains = (props: GainProps) => {
    const { gains, aliases, asOfDate } = props
    return (
        <div>
            <h2 className="hidden print:block">Capital Gains</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th>Date Sold</th>
                        <th>Symbol</th>
                        <th className="text-right">Sold</th>
                        <th>Date Bought</th>
                        <th className="text-right">Bought</th>
                        <th>Match Rule</th>
                        <th className="text-right">Cost</th>
                        <th className="text-right">Total Cost</th>
                        <th className="text-right">Proceeds</th>
                        <th className="text-right">Gain</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {gains.map((gain, index) => (
                        <GainDetail gain={gain} aliases={aliases} asOfDate={asOfDate} key={index} />
                    ))}
                    <Totals gains={gains} />
                </tbody>
            </table>
        </div>
    )
}
