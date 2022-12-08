import Gain from './gain'
import React from 'react'

interface TotalsProps {
    gains: Gain[]
}

const decimals = 5

export const Totals = (props: TotalsProps) => {
    const { gains } = props
    let totalCost = 0
    let totalProceeds = 0
    let totalGain = 0
    for (const gain of gains) {
        totalCost += gain.costInBase
        totalProceeds += gain.proceedsInBase
        totalGain += gain.profitInBase
    }

    return (
        <tr className="border-t pt-4">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <th className="pt-4">Totals</th>
            <th className="align-bottom text-right">{totalCost.toFixed(decimals)}</th>
            <th className="align-bottom text-right">{totalProceeds.toFixed(decimals)}</th>
            <th className="align-bottom text-right">{totalGain.toFixed(decimals)}</th>
        </tr>
    )
}

export default Totals
