import {
    useEffect,
    useState,
} from "react";

import {
    Link,
} from "react-router-dom";

import {
    ItemSearch,
} from "./ItemSearch";

import {
    WatchlistDrawer,
} from "./watchlist/WatchlistDrawer.tsx";

import {
    useWatchlist,
} from "./watchlist/WatchlistContext.tsx";

import "../styles/Header.css";


export function Header() {
    const [mobileOpen, setMobileOpen] =
        useState(false);

    const {
        items,
        isOpen,
        openWatchlist,
        closeWatchlist,
        removeItem,
        reorderItems,
    } = useWatchlist();


    const closeMobileMenu = () => {
        setMobileOpen(false);
    };


    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                closeWatchlist();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [
        isOpen,
        closeWatchlist,
    ]);


    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                previousOverflow;
        };
    }, [isOpen]);


    return (
        <>
            <header className="market-header">
                <div className="market-header-inner">
                    <Link
                        to="/"
                        className="market-logo"
                        onClick={closeMobileMenu}
                    >
                        OSRS Market
                    </Link>

                    <nav className="market-nav">
                        <Link to="/items">
                            Items
                        </Link>

                        <a href="#">
                            Movers
                        </a>

                        <a href="#">
                            Volume
                        </a>

                        <button
                            type="button"
                            className="nav-link"
                            onClick={openWatchlist}
                        >
                            Watchlist
                        </button>
                    </nav>

                    <div className="market-header-search">
                        <ItemSearch />
                    </div>

                    <button
                        type="button"
                        className="mobile-menu-button"
                        aria-label="Toggle navigation"
                        aria-expanded={mobileOpen}
                        onClick={() =>
                            setMobileOpen(
                                (current) =>
                                    !current,
                            )
                        }
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>

                <div className="mobile-search">
                    <ItemSearch />
                </div>

                {mobileOpen && (
                    <nav className="mobile-nav">
                        <Link
                            to="/items"
                            onClick={closeMobileMenu}
                        >
                            Items
                        </Link>

                        <a
                            href="#"
                            onClick={closeMobileMenu}
                        >
                            Movers
                        </a>

                        <a
                            href="#"
                            onClick={closeMobileMenu}
                        >
                            Volume
                        </a>

                        <button
                            type="button"
                            className="nav-link"
                            onClick={() => {
                                openWatchlist();
                                closeMobileMenu();
                            }}
                        >
                            Watchlist
                        </button>

                        <Link
                            to="/about"
                            onClick={closeMobileMenu}
                        >
                            About
                        </Link>
                    </nav>
                )}
            </header>

            <WatchlistDrawer
                open={isOpen}
                items={items}
                onClose={closeWatchlist}
                onRemove={removeItem}
                onReorder={reorderItems}
            />
        </>
    );
}