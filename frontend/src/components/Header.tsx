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

import {
    useAuth,
} from "./auth/AuthContext.tsx";

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

    const {
        loading: authLoading,
        user,
        login,
        logout,
    } = useAuth();

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
                        <Link to="/market-movers">
                            Market Movers
                        </Link>

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
                        className="mobile-watchlist-button"
                        aria-label="Open watchlist"
                        onClick={() => {
                            openWatchlist();
                            closeMobileMenu();
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

                        {items.length > 0 && (
                            <span className="mobile-watchlist-count">
                            {items.length}
                        </span>
                        )}
                    </button>

                    {!authLoading && (
                        user ? (
                            <button
                                type="button"
                                className="auth-button auth-button-user"
                                title={
                                    user.email ?? undefined
                                }
                                onClick={() => {
                                    void logout();
                                }}
                            >
                                <span>
                                    {
                                        user.displayName ||
                                        user.email ||
                                        "Account"
                                    }
                                </span>

                                <small>
                                    Log out
                                </small>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="auth-button"
                                onClick={login}
                            >
                                Log in
                            </button>
                        )
                    )}

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
                            to="/market-movers"
                            onClick={closeMobileMenu}
                        >
                            Market Movers
                        </Link>

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

                        {!authLoading && (
                            <button
                                type="button"
                                className="nav-link"
                                onClick={() => {
                                    closeMobileMenu();

                                    if (user) {
                                        void logout();
                                        return;
                                    }

                                    login();
                                }}
                            >
                                {
                                    user
                                        ? `Log out (${
                                            user.displayName ||
                                            user.email ||
                                            "Account"
                                        })`
                                        : "Log in"
                                }
                            </button>
                        )}
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