import React from 'react'
import Gain from './gain'
import GainDetail from './gain-detail'
import Totals from './totals'

interface GainProps {
    gains: Gain[]
}

export const CapitalGains = (props: GainProps) => {
    const { gains } = props
    return (
        <div>
            <h2 className="hidden print:block">Capital Gains</h2>
            <table className="w-full" cellPadding={1}>
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
                        <GainDetail gain={gain} key={index} />
                    ))}
                    <Totals gains={gains} />
                </tbody>
            </table>
        </div>
    )
}
