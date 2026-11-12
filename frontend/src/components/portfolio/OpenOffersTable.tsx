import { useState } from 'react';
import ItemIcon from "./ItemIcon.tsx";
import {formatLocalDateTime} from "../../utils/dateTime.ts";
import {Link} from "react-router-dom";

export type VirtualMerchOffer = {
    id: string;
    itemId: number;
    itemName: string;
    type: 'Buy' | 'Sell';
    quantity: number;
    filledQuantity: number;
    limitPrice: number;
    averageFillPrice: number | null;
    createdAt: string;
};

type OpenOffersTableProps = {
    offers: VirtualMerchOffer[];
    onCancel: (offerId: string) => void;
};

const formatGp = (value: number) =>
    `${Math.round(value).toLocaleString('en-US')} gp`;

const formatQuantity = (value: number) =>
    value.toLocaleString('en-US');

export default function OpenOffersTable({
                                            offers,
                                            onCancel,
                                        }: OpenOffersTableProps) {
    const [sortBy, setSortBy] = useState<
        'item' | 'type' | 'progress' | 'price' | 'created'
    >('created');

    const [ascending, setAscending] = useState(false);

    const changeSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setAscending(!ascending);
        } else {
            setSortBy(column);
            setAscending(true);
        }
    };

    const sortedOffers = [...offers].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'item':
                comparison = a.itemName.localeCompare(b.itemName);
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'progress':
                comparison =
                    a.filledQuantity / a.quantity -
                    b.filledQuantity / b.quantity;
                break;
            case 'price':
                comparison = a.limitPrice - b.limitPrice;
                break;
            case 'created':
                comparison =
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime();
                break;
        }

        return ascending ? comparison : -comparison;
    });

    return (
        <div className="vm-offers-table-wrap">
            <table className="vm-data-table vm-offers-table">
                <thead>
                <tr>
                    <th onClick={() => changeSort('item')}>
                        Item
                    </th>
                    <th onClick={() => changeSort('type')}>
                        Type
                    </th>
                    <th onClick={() => changeSort('progress')}>
                        Progress
                    </th>
                    <th onClick={() => changeSort('price')}>
                        Limit Price
                    </th>
                    <th>Reserved</th>
                    <th onClick={() => changeSort('created')}>
                        Created
                    </th>
                    <th>Action</th>
                </tr>
                </thead>

                <tbody>
                {sortedOffers.map((offer) => {
                    const remaining =
                        offer.quantity - offer.filledQuantity;

                    const progress =
                        (offer.filledQuantity / offer.quantity) * 100;

                    const reserved =
                        offer.type === 'Buy'
                            ? formatGp(remaining * offer.limitPrice)
                            : `${formatQuantity(remaining)} items`;

                    return (
                        <tr key={offer.id}>
                            <td>
                                <div className="vm-table-item">
                                    <ItemIcon itemId={offer.itemId} name={offer.itemName} />
                                    <Link to={`/items/${offer.itemId}`} className="vm-item-link">
                                        {offer.itemName}
                                    </Link>
                                </div>
                            </td>

                            <td>
                                <span className={`vm-trade-type ${offer.type.toLowerCase()}`}>
                                    {offer.type}
                                </span>
                            </td>

                            <td>
                                <div className="vm-offer-progress">
                                    <span>{formatQuantity(offer.filledQuantity)}{' / '}{formatQuantity(offer.quantity)}</span>
                                    <div className="vm-offer-progress-track">
                                        <div
                                            className={`vm-offer-progress-fill vm-offer-progress-fill--${offer.type}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </td>

                            <td>{formatGp(offer.limitPrice)}</td>

                            <td>{reserved}</td>

                            <td className="vm-offer-date">
                                {formatLocalDateTime(offer.createdAt)}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    className="vm-offer-close"
                                    onClick={() => onCancel(offer.id)}
                                >
                                    Close
                                </button>
                            </td>
                        </tr>
                    );
                })}

                {offers.length === 0 && (
                    <tr>
                        <td colSpan={7} className="vm-offers-empty">
                            No open offers.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}