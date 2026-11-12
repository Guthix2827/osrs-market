import { ChevronDown } from 'lucide-react';
import ItemIcon from "./ItemIcon.tsx";
import {Link} from "react-router-dom";

export type HoldingSortKey =
    | 'name' | 'quantity' | 'averageBuyPrice' | 'currentPrice'
    | 'value' | 'pnl' | 'roi';

export type HoldRowData = {
    id: number;
    itemId: number;
    name: string;
    quantity: number;
    averageBuyPrice: number;
    currentPrice: number;
};

export type HoldingRow = HoldRowData & {
    value: number;
    pnl: number;
    roi: number;
};

type Props = {
    rows: HoldingRow[];
    sort: { key: HoldingSortKey; desc: boolean };
    onSort: (key: HoldingSortKey) => void;
};

const columns: { key: HoldingSortKey; label: string }[] = [
    { key: 'name', label: 'Item' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'averageBuyPrice', label: 'Avg. Buy Price' },
    { key: 'currentPrice', label: 'Current Price' },
    { key: 'value', label: 'Total Value' },
    { key: 'pnl', label: 'Profit' },
    { key: 'roi', label: 'ROI' },
];

const gp = (n: number) => `${Math.round(n).toLocaleString('en-US')} gp`;
const signedGp = (n: number) => `${n > 0 ? '+' : ''}${gp(n)}`;
const signedPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
const tone = (n: number) => n > 0 ? 'positive' : n < 0 ? 'negative' : '';

export default function HoldingsTable({ rows, sort, onSort }: Props) {
    return (
        <table className="vm-data-table vm-holdings-table">
            <thead>
                <tr>
                    {columns.map(({ key, label }) => (
                        <th
                            key={key}
                            scope="col"
                            className={key === 'name' ? 'vm-col-item' : 'vm-col-number'}
                            aria-sort={sort.key === key
                                ? (sort.desc ? 'descending' : 'ascending')
                                : 'none'}
                        >
                            <button
                                type="button"
                                className={sort.key === key ? 'vm-sort-active' : ''}
                                onClick={() => onSort(key)}
                            >
                                {label}
                                <ChevronDown
                                    size={13}
                                    className={sort.key === key && !sort.desc ? 'vm-up' : ''}
                                />
                            </button>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map(h => (
                    <tr key={h.id}>
                        <td className="vm-table-item">
                            <ItemIcon itemId={h.itemId} name={h.name} />
                            <Link to={`/items/${h.itemId}`} className="vm-item-link">
                                {h.name}
                            </Link>
                        </td>
                        <td className="vm-col-number">{h.quantity.toLocaleString('en-US')}</td>
                        <td className="vm-col-number">{gp(h.averageBuyPrice)}</td>
                        <td className="vm-col-number">{gp(h.currentPrice)}</td>
                        <td className="vm-col-number vm-value">{gp(h.value)}</td>
                        <td className={`vm-col-number ${tone(h.pnl)}`}>{signedGp(h.pnl)}</td>
                        <td className={`vm-col-number ${tone(h.roi)}`}>{signedPercent(h.roi)}</td>
                    </tr>
                ))}
                {rows.length === 0 && (
                    <tr><td colSpan={columns.length} className="vm-offers-empty">No holdings yet.</td></tr>
                )}
            </tbody>
        </table>
    );
}
