import {Link} from "react-router-dom";
import "./WatchlistDrawer.css";

import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";

import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
    CSS,
} from "@dnd-kit/utilities";
import type {WatchSummary} from "../../types/watchlist.ts";
import {API_BASE_URL} from "../../config/api.ts";
import {useWatchlist} from "./WatchlistContext.tsx";

export interface WatchedItem {
    id: number;
    name: string;
    icon: string;
    price: number | null;
    summary: WatchSummary | null;
    changeRange: WatchlistChangeRange;
}

interface WatchlistDrawerProps {
    open: boolean;
    items: WatchedItem[];
    onClose: () => void;
    onRemove: (itemId: number) => void;
    onReorder: (
        fromIndex: number,
        toIndex: number,
    ) => void;
}

interface SortableWatchlistItemProps {
    item: WatchedItem;
    onClose: () => void;
    onRemove: (itemId: number) => void;
}

type WatchlistChangeRange =
    | "30m"
    | "1h"
    | "6h"
    | "12h"
    | "24h";

function formatGp(
    value: number | null,
) {
    if (value === null) {
        return "—";
    }

    return `${value.toLocaleString()} gp`;
}

function calculatePriceChange(
    previousPrice: number | null,
    currentPrice: number | null,
): number | null {
    if (
        previousPrice === null ||
        currentPrice === null ||
        previousPrice <= 0
    ) {
        return null;
    }

    return (
        (currentPrice - previousPrice) /
        previousPrice
    ) * 100;
}

function formatPriceChange(
    change: number | null,
): string {
    if (
        change === null ||
        !Number.isFinite(change)
    ) {
        return "—";
    }

    const prefix =
        change >= 0
            ? "+"
            : "";

    return `${prefix}${change.toFixed(1)}%`;
}

function SortableWatchlistItem({item, onClose, onRemove}: SortableWatchlistItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
    });

    const changeRange = item.changeRange ?? "30m";

    const style = {
        transform:
            CSS.Transform.toString(transform),
        transition,
        zIndex:
            isDragging
                ? 10
                : undefined,
    };

    const referencePrice =
        item.summary?.references[changeRange] ??
        null;

    const changePercent =
        calculatePriceChange(
            referencePrice,
            item.price,
        );

    const {
        setItemChangeRange,
    } = useWatchlist();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`watchlist-item ${
                isDragging
                    ? "is-dragging"
                    : ""
            }`}
            {...attributes}
            {...listeners}
        >
            <div className="watchlist-item-icon">
                <img
                    src={`${API_BASE_URL}${item.icon}`}
                    alt=""
                />
            </div>

            <div className="watchlist-item-main">
                <Link
                    to={`/items/${item.id}`}
                    className="watchlist-item-name"
                    onPointerDown={(event) =>
                        event.stopPropagation()
                    }
                    onClick={onClose}
                >
                    {item.name}
                </Link>

                <span className="watchlist-item-price">
                    {formatGp(item.price)}
                </span>
            </div>

            <div className="watchlist-item-change">
                <select
                    className="watchlist-range-select"
                    value={changeRange}
                    aria-label={`Price change range for ${item.name}`}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                    }}
                    onChange={(event) => {
                        setItemChangeRange(
                            item.id,
                            event.target.value as WatchlistChangeRange,
                        );
                    }}
                >
                    <option value="30m">30m</option>
                    <option value="1h">1h</option>
                    <option value="6h">6h</option>
                    <option value="12h">12h</option>
                    <option value="24h">24h</option>
                </select>

                <strong
                    className={
                        changePercent === null
                            ? ""
                            : changePercent >= 0
                                ? "positive"
                                : "negative"
                    }
                >
                    {formatPriceChange(changePercent)}
                </strong>
            </div>

            <button
                type="button"
                className="watchlist-remove"
                title="Remove from watchlist"
                aria-label={`Remove ${item.name} from watchlist`}
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove(item.id);
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        d="M6.5 4.5h11v15l-5.5-3.5-5.5 3.5z"
                        fill="currentColor"
                    />
                </svg>
            </button>
        </div>
    );
}


export function WatchlistDrawer({open, items, onClose, onRemove, onReorder}: WatchlistDrawerProps) {
    const sensors = useSensors(
        useSensor(
            PointerSensor,
            {
                activationConstraint: {
                    distance: 5,
                },
            },
        ),

        useSensor(
            KeyboardSensor,
            {
                coordinateGetter:
                sortableKeyboardCoordinates,
            },
        ),
    );

    const handleDragEnd = (
        event: DragEndEvent,
    ) => {
        const {
            active,
            over,
        } = event;

        if (
            !over ||
            active.id === over.id
        ) {
            return;
        }

        const fromIndex =
            items.findIndex(
                (item) =>
                    item.id === active.id,
            );

        const toIndex =
            items.findIndex(
                (item) =>
                    item.id === over.id,
            );

        if (
            fromIndex === -1 ||
            toIndex === -1
        ) {
            return;
        }

        onReorder(
            fromIndex,
            toIndex,
        );
    };

    return (
        <>
            <div
                className={`watchlist-backdrop ${
                    open ? "is-open" : ""
                }`}
                onClick={onClose}
            />

            <aside
                className={`watchlist-drawer ${
                    open ? "is-open" : ""
                }`}
            >
                <div className="watchlist-drawer-header">
                    <h2>
                        Watchlist
                    </h2>

                    <button
                        type="button"
                        className="watchlist-close"
                        onClick={onClose}
                        aria-label="Close watchlist"
                    >
                        ×
                    </button>
                </div>

                <div className="watchlist-items">
                    <div className="watchlist-change-hint">
                        Change is measured from the
                        <strong> selected range </strong>
                        to <strong>now</strong>.
                    </div>

                    {items.length === 0 ? (
                        <div className="watchlist-empty">
                            No watched items yet.
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={
                                closestCenter
                            }
                            onDragEnd={
                                handleDragEnd
                            }
                        >
                            <SortableContext
                                items={items.map(
                                    (item) =>
                                        item.id,
                                )}
                                strategy={
                                    verticalListSortingStrategy
                                }
                            >
                                {items.map(
                                    (item) => (
                                        <SortableWatchlistItem
                                            key={item.id}
                                            item={item}
                                            onClose={onClose}
                                            onRemove={onRemove}
                                        />
                                    ),
                                )}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </aside>
        </>
    );
}