import {useState, type FormEvent} from 'react';
import './VirtualMerchCreatePage.css';

const MAX_NAME_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 250;

export function VirtualMerchCreatePage() {
    const [portfolioName, setPortfolioName] = useState('');
    const [description, setDescription] = useState('');
    const [created, setCreated] = useState(false);

    const handleCreate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!portfolioName.trim() || created) return;
        // Mock only: replace with the portfolio creation API when available.
        setCreated(true);
    };

    return (
        <main className="vm-create-page">
            <section className="vm-create-panel">
                <header className="vm-create-heading">
                    <h1>Create Your Portfolio</h1>
                    <p>
                        Set up your trading identity to start your Virtual Merch journey.
                        <br className="vm-create-desktop-break" />
                        Your portfolio will be public on the Hiscores and your profile.
                    </p>
                </header>

                <form className="vm-create-form" onSubmit={handleCreate}>
                    <div className="vm-create-field">
                        <label htmlFor="vm-portfolio-name">
                            Portfolio Name <span className="vm-create-required">*</span>
                        </label>
                        <input
                            id="vm-portfolio-name"
                            type="text"
                            value={portfolioName}
                            onChange={(event) => setPortfolioName(event.target.value)}
                            maxLength={MAX_NAME_LENGTH}
                            placeholder="Enter your portfolio name"
                            autoComplete="off"
                            required
                            disabled={created}
                        />
                        <div className="vm-create-field-meta">
                            <span>The name shown on the Hiscores and your public portfolio.</span>
                            <span className="vm-create-count">{portfolioName.length} / {MAX_NAME_LENGTH}</span>
                        </div>
                    </div>

                    <div className="vm-create-field">
                        <label htmlFor="vm-portfolio-description">
                            Description <span className="vm-create-optional">(optional)</span>
                        </label>
                        <textarea
                            id="vm-portfolio-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            rows={3}
                            placeholder="Tell others about your trading style or goals..."
                            disabled={created}
                        />
                        <div className="vm-create-field-meta">
                            <span>A short description about your trading style or goals.</span>
                            <span className="vm-create-count">{description.length} / {MAX_DESCRIPTION_LENGTH}</span>
                        </div>
                    </div>

                    <div className="vm-create-balance">
                        <span>Starting Balance</span>
                        <strong>100,000,000 GP</strong>
                        <small>Every merchant starts with the same virtual balance. No real GP is required.</small>
                    </div>

                    <button
                        className="vm-create-button"
                        type="submit"
                        disabled={created || !portfolioName.trim()}
                    >
                        {created ? 'Portfolio Created (Mock)' : 'Create Portfolio'}
                    </button>

                    <p className="vm-create-footnote" role={created ? 'status' : undefined}>
                        {created
                            ? 'Mock portfolio created. No data has been saved yet.'
                            : 'You can edit your portfolio name and description later from your portfolio settings.'}
                    </p>
                </form>
            </section>
        </main>
    );
}