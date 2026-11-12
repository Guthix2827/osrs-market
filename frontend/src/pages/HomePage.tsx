
import { Link } from 'react-router-dom';
import './HomePage.css';

const openWatchlist = () => {
    document.querySelector<HTMLButtonElement>(
        '.market-nav button.nav-link'
    )?.click();
};

const features = [
    {
        title: 'Watchlist',
        description:
            'Track your favorite items and monitor their price changes over time.',
        icon: 'bookmark',
        image: '/images/home/watchlist.png',
        alt: 'OSRS Market watchlist preview',
        href: '/watchlist',
    },
    {
        title: 'Item Page',
        description:
            'Detailed item information with price history, volume, trading metrics, and market insights.',
        icon: 'chart',
        image: '/images/home/item-page.png',
        alt: 'OSRS Market item analytics preview',
        href: '/items/1042',
    },
    {
        title: 'Market Movers',
        description:
            'Discover the biggest gainers, losers, and most traded items across multiple time ranges.',
        icon: 'trending',
        image: '/images/home/market-movers.png',
        alt: 'OSRS Market market movers preview',
        href: '/market-movers',
    },
] as const;

function FeatureIcon({ type }: { type: string }) {
    switch (type) {
        case 'bookmark':
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12v18l-6-4-6 4V3z" />
                </svg>
            );

        case 'chart':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="13" width="5" height="8" rx="1" />
                    <rect x="10" y="8" width="5" height="13" rx="1" />
                    <rect x="17" y="3" width="5" height="18" rx="1" />
                </svg>
            );

        default:
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 17 7-7 4 4 7-8" />
                    <path d="M15 6h6v6" />
                </svg>
            );
    }
}

export default function HomePage() {
    return (
        <main className="home-page">
            <div className="home-container">

                <section className="home-hero">
                    <div className="home-hero-content">
                        <h1>OSRS Market</h1>
                        <p>
                            Track Grand Exchange prices, explore market trends, discover profitable flips, and put your trading skills to the test with virtual merching.
                        </p>
                    </div>

                    <div className="home-hero-art">
                        <img
                            src="/images/home/grand-exchange.png"
                            alt="Old School RuneScape Grand Exchange"
                        />
                    </div>
                </section>

                <section className="home-features">
                    <div className="home-section-heading">
                        <span className="home-eyebrow">FEATURES</span>
                        <h2>Core tools for GE trading.</h2>
                        <p>
                            Explore the main features of OSRS Market,
                            built to make Grand Exchange trading easier
                            and more efficient.
                        </p>
                    </div>

                    <div className="home-feature-list">
                        {features.map((feature) => (
                            <Link
                                key={feature.title}
                                to={feature.href}
                                className="home-feature"
                                onClick={(e) => {
                                    if (feature.title === 'Watchlist') {
                                        e.preventDefault();
                                        openWatchlist();
                                    }
                                }}
                            >
                                <div className="home-feature-content">
                                    <div className="home-feature-icon">
                                        <FeatureIcon type={feature.icon} />
                                    </div>

                                    <div>
                                        <h3>{feature.title}</h3>
                                        <p>{feature.description}</p>
                                    </div>
                                </div>

                                <div className="home-feature-preview">
                                    <img
                                        src={feature.image}
                                        alt={feature.alt}
                                        loading="lazy"
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="home-competition">
                    <div className="home-competition-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="1.8"
                             strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4z" />
                            <path d="M7 6H3v3a4 4 0 0 0 4 4M17 6h4v3a4 4 0 0 1-4 4" />
                        </svg>
                    </div>

                    <div className="home-competition-content">
                        <span className="home-eyebrow">COMING SOON</span>
                        <h2>Virtual Merch Competition</h2>
                        <p>
                            A virtual trading game using real OSRS market data.
                            Build your portfolio, compete with other players
                            and climb the global hiscores.
                        </p>
                    </div>
                </section>

                <section className="home-about">
                    <div>
                        <h2>About OSRS Market</h2>
                        <p>
                            Learn more about the project, data sources,
                            and technology.
                        </p>
                    </div>

                    <Link to="/about" className="home-about-link" onClick={() => window.scrollTo(0, 0)}>
                        About <span aria-hidden="true">→</span>
                    </Link>
                </section>

            </div>
        </main>
    );
}
