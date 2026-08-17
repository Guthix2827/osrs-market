import "./AboutPage.css";

export default function AboutPage() {
    return (
        <main className="about-page">
            <section className="about-hero">
                <div className="about-hero-inner">
                    <span className="about-kicker">
                        About OSRS Market
                    </span>

                    <h1>
                        Better visibility into the Old School RuneScape market.
                    </h1>

                    <p>
                        OSRS Market is a market data and analytics project built
                        around Old School RuneScape Grand Exchange pricing.
                        It combines live price collection, historical data and
                        simple trading metrics into a clean interface focused
                        on making market behaviour easier to understand.
                    </p>
                </div>
            </section>

            <section className="about-content">
                <div className="about-grid">
                    <article className="about-card">
                        <h2>
                            Market data
                        </h2>

                        <p>
                            Item metadata and market pricing are collected from
                            public Old School RuneScape Wiki APIs and stored by
                            the backend for historical analysis.
                        </p>
                    </article>

                    <article className="about-card">
                        <h2>
                            Historical tracking
                        </h2>

                        <p>
                            Price history is collected continuously and can be
                            backfilled when needed, allowing item pages to show
                            short-term and long-term market behaviour.
                        </p>
                    </article>

                    <article className="about-card">
                        <h2>
                            Trading insights
                        </h2>

                        <p>
                            The interface highlights metrics such as spread,
                            margin, return on investment, trading volume and
                            broader market movement.
                        </p>
                    </article>
                </div>

                <div className="about-section">
                    <div className="about-section-heading">
                        <span>
                            The project
                        </span>

                        <h2>
                            Built as a real full-stack market application.
                        </h2>
                    </div>

                    <div className="about-section-body">
                        <p>
                            The frontend is built with React and TypeScript,
                            while the backend is written in modern C++. The
                            backend is responsible for collecting upstream
                            market data, caching item information, storing price
                            history and exposing the API used by the frontend.
                        </p>

                        <p>
                            PostgreSQL is used for persistent market history,
                            while in-memory stores and caches are used where
                            fast reads make more sense. Background workers
                            handle live price collection, item mapping refreshes,
                            icon downloads and historical backfills.
                        </p>
                    </div>
                </div>

                <div className="about-section">
                    <div className="about-section-heading">
                        <span>
                            Data
                        </span>

                        <h2>
                            Designed around useful history, not unnecessary duplication.
                        </h2>
                    </div>

                    <div className="about-section-body">
                        <p>
                            Recent market data is kept at higher resolution,
                            while longer time ranges are presented at hourly or
                            daily resolution. Historical backfills are used to
                            recover missing data when the service has been
                            offline or an item has not yet been fully populated.
                        </p>

                        <p>
                            Cached history is only retained when the requested
                            range has enough coverage, helping avoid stale or
                            incomplete long-term charts.
                        </p>
                    </div>
                </div>

                <div className="about-section">
                    <div className="about-section-heading">
                        <span>
                            Open source
                        </span>

                        <h2>
                            The project is developed openly on GitHub.
                        </h2>
                    </div>

                    <div className="about-section-body">
                        <p>
                            OSRS Market is an ongoing development project.
                            Features, calculations and infrastructure continue
                            to evolve as the application grows.
                        </p>

                        <a
                            className="about-github-link"
                            href="https://github.com/Guthix2827/osrs-market"
                            target="_blank"
                            rel="noreferrer"
                        >
                            View project on GitHub
                            <span aria-hidden="true">
                                →
                            </span>
                        </a>
                    </div>
                </div>

                <div className="about-disclaimer">
                    <strong>
                        Disclaimer
                    </strong>

                    <p>
                        OSRS Market is an independent project and is not
                        affiliated with or endorsed by Jagex Ltd. Old School
                        RuneScape and RuneScape are trademarks of Jagex Ltd.
                    </p>
                </div>
            </section>
        </main>
    );
}