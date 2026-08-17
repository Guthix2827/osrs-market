import { Link } from "react-router-dom";
import "../styles/Footer.css";

export function Footer() {
    const currentYear =
        new Date().getFullYear();

    return (
        <footer className="market-footer">
            <div className="market-footer-inner">
                <div className="footer-brand">
                    <Link
                        to="/"
                        className="footer-logo"
                    >
                        OSRS Market
                    </Link>

                    <p>
                        Old School RuneScape market data,
                        price history and trading insights.
                    </p>
                </div>

                <div className="footer-links">
                    <div className="footer-column">
                        <span className="footer-heading">
                            Market
                        </span>

                        <Link to="/items">
                            Items
                        </Link>

                        <a href="#">
                            Movers
                        </a>

                        <a href="#">
                            Volume
                        </a>
                    </div>

                    <div className="footer-column">
                        <span className="footer-heading">
                            Resources
                        </span>

                        <a
                            href="https://prices.runescape.wiki/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            RuneScape Wiki Prices
                        </a>

                        <a
                            href="https://oldschool.runescape.wiki/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            OSRS Wiki
                        </a>
                    </div>

                    <div className="footer-column">
                        <span className="footer-heading">
                            Project
                        </span>

                        <a
                            href="https://github.com/Guthix2827/osrs-market"
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>

                        <Link to="/about">
                            About
                        </Link>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <span>
                    © {currentYear} OSRS Market
                </span>

                <span>
                    Not affiliated with Jagex Ltd.
                </span>
            </div>
        </footer>
    );
}