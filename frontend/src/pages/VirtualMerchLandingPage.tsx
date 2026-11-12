import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ChartNoAxesCombined, Trophy } from 'lucide-react';
import './VirtualMerchLandingPage.css';

const steps = [
    {
        number: '01',
        title: 'Create your portfolio',
        description: 'Choose a public portfolio name and start with 100 billion virtual GP.',
    },
    {
        number: '02',
        title: 'Trade Grand Exchange items',
        description: 'Place simulated buy and sell offers using real OSRS market data. Offers can fill partially.',
    },
    {
        number: '03',
        title: 'Grow your profit',
        description: 'Track holdings, completed trades and your position on the public Hiscores.',
    },
];

export function VirtualMerchLandingPage() {
    return (
        <main className="vm-landing-page">
            <section className="vm-landing-hero" aria-labelledby="vm-landing-title">
                <div className="vm-landing-hero-copy">
                    <h1 id="vm-landing-title">Trade the Grand Exchange. <span>Risk nothing.</span></h1>
                    <p>
                        Build a virtual OSRS trading portfolio using real Grand Exchange price data.
                        Test your strategies, follow your profits and compete with other merchants —
                        without spending real GP.
                    </p>
                    <div className="vm-landing-actions">
                        <Link className="vm-landing-button vm-landing-button-primary" to="/merch/create">
                            Get Started <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                        <Link className="vm-landing-button vm-landing-button-secondary" to="/merch/hiscores">
                            View Hiscores
                        </Link>
                    </div>
                </div>
                <aside className="vm-landing-balance" aria-label="Virtual trading starting balance">
                    <span>Every merchant starts with</span>
                    <strong>100,000,000 <small>GP</small></strong>
                    <p>Virtual balance · No real-world value</p>
                    <div className="vm-landing-balance-rule" />
                    <div className="vm-landing-balance-note">
                        <ChartNoAxesCombined size={18} aria-hidden="true" />
                        <span>Real GE data. Simulated trades.</span>
                    </div>
                </aside>
            </section>

            <section className="vm-landing-section" aria-labelledby="vm-landing-how-title">
                <div className="vm-landing-section-heading">
                    <h2 id="vm-landing-how-title">How it works</h2>
                    <p>Three steps to begin your virtual trading journey.</p>
                </div>
                <div className="vm-landing-steps">
                    {steps.map((step) => (
                        <article className="vm-landing-step" key={step.number}>
                            <span className="vm-landing-step-number">{step.number}</span>
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="vm-landing-section" aria-labelledby="vm-landing-explore-title">
                <div className="vm-landing-section-heading">
                    <h2 id="vm-landing-explore-title">Explore Virtual Merch</h2>
                    <p>Follow your progress and see how other merchants perform.</p>
                </div>
                <div className="vm-landing-explore">
                    <Link className="vm-landing-explore-card" to="/merch/portfolio">
                        <BarChart3 size={24} aria-hidden="true" />
                        <div>
                            <h3>Portfolio</h3>
                            <p>View your holdings, open offers and trading history.</p>
                        </div>
                        <ArrowRight size={18} className="vm-landing-card-arrow" aria-hidden="true" />
                    </Link>
                    <Link className="vm-landing-explore-card" to="/merch/hiscores">
                        <Trophy size={24} aria-hidden="true" />
                        <div>
                            <h3>Hiscores</h3>
                            <p>Browse the leaderboard ranked by total profit.</p>
                        </div>
                        <ArrowRight size={18} className="vm-landing-card-arrow" aria-hidden="true" />
                    </Link>
                </div>
            </section>
            <p className="vm-landing-disclaimer">
                Virtual Merch is a fan-made trading simulation. No real GP or real-world money is involved.
            </p>
        </main>
    );
}

export default VirtualMerchLandingPage;
