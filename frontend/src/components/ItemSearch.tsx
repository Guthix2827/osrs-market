import {
    useEffect,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import type {
    ItemSearchResult,
} from "../types/item";

import {
    itemService,
} from "../services/itemService";
import {API_BASE_URL} from "../config/api.ts";


export function ItemSearch() {
    const navigate = useNavigate();

    const [query, setQuery] =
        useState("");

    const [results, setResults] =
        useState<ItemSearchResult[]>([]);

    const [open, setOpen] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const requestId =
        useRef(0);


    useEffect(() => {
        const trimmed =
            query.trim();

        if (trimmed.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        const timeout =
            window.setTimeout(
                async () => {
                    const currentRequest =
                        ++requestId.current;

                    try {
                        setLoading(true);

                        const data =
                            await itemService.searchItems(
                                trimmed,
                            );

                        if (
                            currentRequest !==
                            requestId.current
                        ) {
                            return;
                        }

                        setResults(data);
                        setOpen(true);
                    } catch (error) {
                        console.error(
                            "Item search failed",
                            error,
                        );
                    } finally {
                        if (
                            currentRequest ===
                            requestId.current
                        ) {
                            setLoading(false);
                        }
                    }
                },
                250,
            );

        return () =>
            window.clearTimeout(timeout);
    }, [query]);


    const selectItem = (
        item: ItemSearchResult,
    ) => {
        setQuery("");
        setResults([]);
        setOpen(false);

        navigate(
            `/items/${item.id}`,
        );
    };


    return (
        <div className="market-search-wrapper">
            <div className="market-search">
        <span className="search-icon">
            ⌕
        </span>

                <input
                    type="text"
                    value={query}
                    placeholder="Search items by name or ID..."
                    onChange={(event) =>
                        setQuery(event.target.value)
                    }
                    onFocus={() => {
                        if (results.length > 0) {
                            setOpen(true);
                        }
                    }}
                />

                {loading && (
                    <span className="search-loading">
                ...
            </span>
                )}

                <kbd>/</kbd>
            </div>

            {open && (
                <div className="search-results">
                    {results.length === 0 ? (
                        <div className="search-empty">
                            No items found
                        </div>
                    ) : (
                        results.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="search-result"
                                onClick={() =>
                                    selectItem(item)
                                }
                            >
                                <div className="search-result-icon">
                                    <img
                                        src={`${API_BASE_URL}${item.icon}`}
                                        alt={item.name}
                                    />
                                </div>

                                <div className="search-result-info">
                                    <strong className="search-result-name">
                                        {item.name}
                                    </strong>

                                    <span className="search-result-meta">
                                ID: {item.id}
                            </span>
                                </div>

                                {item.members && (
                                    <span className="search-members">
                                Members
                            </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}