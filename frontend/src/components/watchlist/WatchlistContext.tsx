import {
    createContext,
    useContext,
    useState,
    type ReactNode, useCallback, useEffect,
} from "react";
import type {WatchedItem} from "./WatchlistDrawer.tsx";
import {WATCH_SUMMARY_REFRESH_MS, watchlistService} from "../../services/watchlistService.ts";
import type {WatchlistChangeRange} from "../../types/watchlist.ts";


interface WatchlistContextType {
    items: WatchedItem[];
    isOpen: boolean;

    openWatchlist: () => void;
    closeWatchlist: () => void;

    addItem: (item: WatchedItem) => void;
    removeItem: (itemId: number) => void;

    reorderItems: (
        fromIndex: number,
        toIndex: number,
    ) => void;

    isWatched: (itemId: number) => boolean;
    setItemChangeRange: (
        itemId: number,
        range: WatchlistChangeRange,
    ) => void;
    getWatchedItem: (
        itemId: number
    ) => WatchedItem | null;
}

const WatchlistContext =
    createContext<WatchlistContextType | null>(
        null,
    );

export function WatchlistProvider({children}: { children: ReactNode; }) {

    const WATCHLIST_STORAGE_KEY = "watchlist";

    const [items, setItems] = useState<WatchedItem[]>(() => {
        try {
            const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    const [isOpen, setIsOpen] =
        useState(false);

    const openWatchlist = () => {
        setIsOpen(true);
    };


    const closeWatchlist = () => {
        setIsOpen(false);
    };


    const addItem = (
        item: WatchedItem,
    ) => {
        setItems((current) => {
            if (
                current.some(
                    (watched) =>
                        watched.id === item.id,
                )
            ) {
                return current;
            }

            return [
                ...current,
                item,
            ];
        });
        setIsOpen(true);
    };


    const removeItem = (
        itemId: number,
    ) => {
        setItems((current) =>
            current.filter(
                (item) =>
                    item.id !== itemId,
            ),
        );
    };

    useEffect(() => {
        try {
            localStorage.setItem(
                WATCHLIST_STORAGE_KEY,
                JSON.stringify(items),
            );
        } catch (error) {
            console.error(
                "Failed to save watchlist",
                error,
            );
        }
    }, [items]);

    const reorderItems = (
        fromIndex: number,
        toIndex: number,
    ) => {
        setItems((current) => {
            const next = [...current];

            const [moved] = next.splice(
                fromIndex,
                1,
            );

            next.splice(
                toIndex,
                0,
                moved,
            );

            return next;
        });
    };


    const isWatched = (
        itemId: number,
    ) =>
        items.some(
            (item) =>
                item.id === itemId,
        );

    function getNextRefreshAt(
        item: WatchedItem,
    ): number {
        if (!item.summary) {
            return Date.now();
        }

        return (
            item.summary.generatedAt * 1000 +
            WATCH_SUMMARY_REFRESH_MS
        );
    }

    function isWatchSummaryStale(
        item: WatchedItem,
        now: number,
    ): boolean {
        if (!item.summary) {
            return true;
        }

        return now >= getNextRefreshAt(item);
    }

    const setItemChangeRange = useCallback((itemId: number, changeRange: WatchlistChangeRange,) => {
            setItems((current) =>
                current.map((item) =>
                    item.id === itemId
                        ? {
                            ...item,
                            changeRange,
                        }
                        : item,
                ),
            );
        },
        [],
    );

    const getWatchedItem = useCallback(
        (itemId: number) =>
            items.find(
                (item) => item.id === itemId
            ) ?? null,
        [items],
    );

    const refreshItems =
        useCallback(
            async (
                itemsToRefresh:
                WatchedItem[],
            ) => {
                const results =
                    await Promise.allSettled(
                        itemsToRefresh.map(
                            async (item) => ({
                                itemId: item.id,
                                summary: await watchlistService.getWatchSummary(item.id)
                            }),
                        ),
                    );

                const successful =
                    results.flatMap(
                        (result) =>
                            result.status ===
                            "fulfilled"
                                ? [result.value]
                                : [],
                    );

                if (
                    successful.length === 0
                ) {
                    return;
                }

                setItems((current) =>
                    current.map((item) => {
                        const updated =
                            successful.find(
                                (result) =>
                                    result.itemId ===
                                    item.id,
                            );

                        return updated
                            ? {
                                ...item,
                                summary:
                                updated.summary,
                            }
                            : item;
                    }),
                );
            },
            [],
        );

    useEffect(() => {
        if (items.length === 0) {
            return;
        }

        const now = Date.now();

        const staleItems =
            items.filter(
                (item) =>
                    isWatchSummaryStale(
                        item,
                        now,
                    ),
            );

        if (staleItems.length > 0) {
            void refreshItems(staleItems);
            return;
        }

        const nextRefreshAt =
            Math.min(
                ...items.map(
                    getNextRefreshAt,
                ),
            );

        const timeoutId =
            window.setTimeout(() => {
                    const currentNow =
                        Date.now();

                    const dueItems =
                        items.filter(
                            (item) =>
                                isWatchSummaryStale(
                                    item,
                                    currentNow,
                                ),
                        );

                    if (
                        dueItems.length > 0
                    ) {
                        void refreshItems(
                            dueItems,
                        );
                    }
                },
                Math.max(
                    0,
                    nextRefreshAt - now,
                ),
            );

        return () => {
            window.clearTimeout(
                timeoutId,
            );
        };
    }, [
        items,
        refreshItems,
    ]);

    useEffect(() => {
        const handleVisibilityChange =
            () => {
                if (
                    document.visibilityState !==
                    "visible"
                ) {
                    return;
                }

                const now =
                    Date.now();

                const staleItems =
                    items.filter(
                        (item) =>
                            isWatchSummaryStale(
                                item,
                                now,
                            ),
                    );

                if (
                    staleItems.length > 0
                ) {
                    void refreshItems(
                        staleItems,
                    );
                }
            };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [
        items,
        refreshItems,
    ]);


    return (
        <WatchlistContext.Provider
            value={{
                items,
                isOpen,

                openWatchlist,
                closeWatchlist,

                addItem,
                removeItem,
                reorderItems,

                isWatched,
                setItemChangeRange,
                getWatchedItem
            }}
        >
            {children}
        </WatchlistContext.Provider>
    );
}


export function useWatchlist() {
    const context =
        useContext(WatchlistContext);

    if (!context) {
        throw new Error(
            "useWatchlist must be used inside WatchlistProvider",
        );
    }

    return context;
}