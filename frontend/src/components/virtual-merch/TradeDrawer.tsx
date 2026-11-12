import {useEffect, useState} from 'react';
import {API_BASE_URL} from '../../config/api.ts';
import type {VirtualMerchAccount} from "./VirtualMerchAccount.ts";

type Side = 'buy' | 'sell';

export interface VirtualTradeItem {
    id: number;
    name: string;
    icon: string;
    instantBuy: number | null;
    instantSell: number | null;
    buyLimit: number | null;
}

export interface VirtualOfferDraft {
    itemId: number;
    side: Side;
    unitPriceGp: number;
    quantity: number;
}

export function TradeDrawer({open, item, account, ownedQuantity = 0, onClose, onPlaceOffer}: {
    open: boolean;
    item: VirtualTradeItem | null;
    account: VirtualMerchAccount;
    ownedQuantity?: number;
    onClose: () => void;
    onPlaceOffer: (offer: VirtualOfferDraft) => void;
}) {
    const [side, setSide] = useState<Side>('buy');
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        setSide('buy');
        setPrice(Number(item?.instantBuy ?? ''));
        setQuantity(1);
    }, [item?.id]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', keydown);
        return () => window.removeEventListener('keydown', keydown);
    }, [open, onClose]);

    const p = Number(price);
    const q = Number(quantity);
    const valid = Number.isSafeInteger(p) && p > 0 && Number.isSafeInteger(q) && q > 0 && Number.isSafeInteger(p * q);
    const total = valid ? p * q : 0;
    const noSlots = account.activeOffers >= account.maxOffers;
    const insufficient = side === 'buy' ? total > account.availableGp : q > ownedQuantity;
    const disabled = !valid || insufficient || noSlots || Boolean(account.tradingPaused) || !item;
    const reference = side === 'buy' ? item?.instantBuy : item?.instantSell;
    const changeSide = (next: Side) => {
        setSide(next);
        setPrice(Number((next === 'buy' ? item?.instantBuy : item?.instantSell) ?? ''));
    };
    const changePercent = (percent: number) => setPrice(Number(Math.max(1, Math.round((Number(price) || reference || 1) * (1 + percent)))));
    const format = (value: number) => value.toLocaleString('en-US');
    const onlyDigits = (value: string): string =>
        value.replace(/[^0-9]/g, '');
    return <>
        <div className={`vm-trade-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true"/>
        <aside className={`vm-trade-drawer ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true"
               aria-label="Trade Item" aria-hidden={!open}>
            <header className="vm-trade-header"><h2>Trade Item</h2>
                <button type="button" onClick={onClose} aria-label="Close trade drawer">×</button>
            </header>
            {item && <div className="vm-trade-body">
                <div className="vm-trade-item">
                    <div className="vm-trade-icon"><img src={`${API_BASE_URL}${item.icon}`} alt=""/></div>
                    <div><strong>{item.name}</strong><small>Item ID: {item.id}</small></div>
                </div>
                <div className="vm-trade-tabs">
                    <button type="button" className={side === 'buy' ? 'selected buy' : ''}
                            onClick={() => changeSide('buy')}>Buy Offer
                    </button>
                    <button type="button" className={side === 'sell' ? 'selected sell' : ''}
                            onClick={() => changeSide('sell')}>Sell Offer
                    </button>
                </div>
                <label
                    className="vm-trade-field"><span>{side === 'buy' ? 'Maximum buy price (gp)' : 'Minimum sell price (gp)'}</span>
                    <div className="vm-trade-controls">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={price}
                            onChange={(e) => {
                                const value = onlyDigits(e.target.value);
                                setPrice(value === '' ? 0 : Number(value));
                            }}
                        />
                        <button type="button" onClick={() => changePercent(-0.01)}>−1%</button>
                        <button type="button"
                                onClick={() => setPrice(Number(Math.round(((item.instantBuy ?? 0) + (item.instantSell ?? 0)) / 2) || reference || 1))}>Mid
                        </button>
                        <button type="button" onClick={() => changePercent(0.01)}>+1%</button>
                    </div>
                </label>
                <label className="vm-trade-field"><span>Quantity</span>
                    <div className="vm-trade-controls">

                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={quantity}
                            onChange={(e) => {
                                const value = onlyDigits(e.target.value);
                                setQuantity(value === '' ? 0 : Number(value));
                            }}
                        />

                        {[1, 10, 100, 1000].map(n => (
                            <button
                                type="button"
                                key={n}
                                onClick={() =>
                                    setQuantity(
                                        Math.max(0, Math.floor(Number(quantity) || 0)) + n
                                    )
                                }
                            >
                                +{format(n)}
                            </button>
                        ))}

                    </div>
                </label>
                <div className="vm-trade-total">
                    <div>
                        <span>Total offer value {side === 'buy' ? '(reserved)' : ''}</span><small>{valid ? `${format(q)} × ${format(p)} gp` : 'Enter a valid price and quantity'}</small>
                    </div>
                    <strong className={side}>{format(total)} gp</strong></div>
                <button type="button" className={`vm-place-offer ${side}`} disabled={disabled} onClick={() => {
                    if (item && !disabled) onPlaceOffer({itemId: item.id, side, unitPriceGp: p, quantity: q});
                }}>{side === 'buy' ? 'Place Buy Offer' : 'Place Sell Offer'}</button>
                {disabled && <p className="vm-trade-warning"
                                role="status">{account.tradingPaused ? 'Trading temporarily paused.' : noSlots ? 'All offer slots are occupied.' : insufficient ? (side === 'buy' ? 'Insufficient available GP.' : 'Insufficient available items.') : 'Enter a valid offer.'}</p>}
                <div className="vm-trade-market"><h3>Market Info</h3>
                    <div>
                        <span>Instant Buy (High)</span><strong>{item.instantBuy == null ? '—' : `${format(item.instantBuy)} gp`}</strong>
                    </div>
                    <div>
                        <span>Instant Sell (Low)</span><strong>{item.instantSell == null ? '—' : `${format(item.instantSell)} gp`}</strong>
                    </div>
                    <div>
                        <span>Buy Limit</span><strong>{item.buyLimit == null ? '—' : `${format(item.buyLimit)} / 4h`}</strong>
                    </div>
                </div>
            </div>}
        </aside>
    </>;
}
