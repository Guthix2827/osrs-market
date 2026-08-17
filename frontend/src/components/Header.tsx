import { useState } from "react";
import { Link } from "react-router-dom";

import { ItemSearch } from "./ItemSearch";

import "../styles/Header.css";

export function Header() {
    const [mobileOpen, setMobileOpen] =
        useState(false);

    const closeMobileMenu = () => {
        setMobileOpen(false);
    };

    return (
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

                    <a href="#">
                        Watchlist
                    </a>
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
                            (current) => !current,
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

                    <a
                        href="#"
                        onClick={closeMobileMenu}
                    >
                        Watchlist
                    </a>

                    <Link
                        to="/about"
                        onClick={closeMobileMenu}
                    >
                        About
                    </Link>
                </nav>
            )}
        </header>
    );
}