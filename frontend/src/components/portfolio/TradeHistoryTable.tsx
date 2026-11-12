import { formatLocalDateTime } from '../../utils/dateTime.ts';
import ItemIcon from "./ItemIcon.tsx";
import {Link} from "react-router-dom";

export type TradeRowData = {
    id: number;
    itemId: number;
    date: string;
    type: 'Buy' | 'Sell';
    item: string;
    quantity: number;
    unitPrice: number;
};

type Props = { trades: TradeRowData[] };

const gp = (n: number) => `${Math.round(n).toLocaleString('en-US')} gp`;

export default function TradeHistoryTable({ trades }: Props) {
    return (
        <table className="vm-data-table vm-trades-table">
            <thead>
                <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Time</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="vm-col-number">Quantity</th>
                    <th scope="col" className="vm-col-number">Price (ea)</th>
                    <th scope="col" className="vm-col-number">Total</th>
                </tr>
            </thead>
            <tbody>
                {trades.map(t => (
                    <tr key={t.id}>
                        <td className="vm-table-item">
                            <ItemIcon itemId={t.itemId} name={t.item} />
                            <Link to={`/items/${t.itemId}`} className="vm-item-link">
                                {t.item}
                            </Link>
                        </td>
                        <td className="vm-date">{formatLocalDateTime(t.date)}</td>
                        <td>
                            <span className={`vm-trade-type ${t.type.toLowerCase()}`}>
                                {t.type}
                            </span>
                        </td>
                        <td className="vm-col-number">{t.quantity.toLocaleString('en-US')}</td>
                        <td className="vm-col-number">{gp(t.unitPrice)}</td>
                        <td className="vm-col-number vm-value">{gp(t.quantity * t.unitPrice)}</td>
                    </tr>
                ))}
                {trades.length === 0 && (
                    <tr><td colSpan={6} className="vm-offers-empty">No trades yet.</td></tr>
                )}
            </tbody>
        </table>
    );
}
