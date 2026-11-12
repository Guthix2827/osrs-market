import {
    Route,
    Routes,
} from "react-router-dom";

import ItemPage from "./pages/ItemPage";
import AboutPage from "./pages/AboutPage";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer";
import "./App.css";
import {MarketMoversPage} from "./pages/MarketMoversPage.tsx";
import {AppProviders} from "./components/AppProviders.tsx";
import HomePage from "./pages/HomePage.tsx";
import PortfolioPage from "./pages/PortfolioPage.tsx";
import VirtualMerchHiscoresPage from "./pages/VirtualMerchHiscoresPage.tsx";
import {VirtualMerchCreatePage} from "./pages/VirtualMerchCreatePage.tsx";
import VirtualMerchLandingPage from "./pages/VirtualMerchLandingPage.tsx";

function AppContent() {
    return (
        <div className="market-page">
            <Header />

            <Routes>
                <Route
                    path="/items/:id"
                    element={<ItemPage />}
                />

                <Route
                    path="/about"
                    element={<AboutPage />}
                />

                <Route path="/" element={<HomePage />} />

                <Route
                    path="/market-movers"
                    element={<MarketMoversPage/>}
                />

                <Route path="/merch/get-started" element={<VirtualMerchLandingPage />} />

                <Route
                    path="/merch/portfolio"
                    element={<PortfolioPage/>}
                />

                <Route
                    path="/merch/hiscores"
                    element={<VirtualMerchHiscoresPage />}
                />

                <Route path="/merch/create" element={<VirtualMerchCreatePage />} />
            </Routes>

            <Footer />
        </div>
    )}

function App() {
    return (
        <AppProviders>
            <AppContent />
        </AppProviders>
    );
}

export default App;