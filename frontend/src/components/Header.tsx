import { Link } from "react-router-dom";
import { ItemSearch } from "./ItemSearch";
import "../styles/Header.css";

export function Header() {
    return (
        <header className="market-header">
            <Link
                to="/"
                className="market-logo"
            >
                OSRS Market
            </Link>

            <nav className="market-nav">
                <Link to="/items">Items</Link>

                <a href="#">Movers</a>
                <a href="#">Volume</a>
                <a href="#">Watchlist</a>
            </nav>

            <ItemSearch />
        </header>
    );
}