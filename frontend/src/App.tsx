import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ItemPage from "./pages/ItemPage";
import AboutPage from "./pages/AboutPage";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer";
import "./App.css";
import {WatchlistProvider} from "./components/watchlist/WatchlistContext.tsx";
import {MarketMoversPage} from "./pages/MarketMoversPage.tsx";

function App() {
    return (
        <BrowserRouter>
            <WatchlistProvider>
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

                        <Route
                            path="/"
                            element={
                                <Navigate
                                    to="/items/6739"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="/market-movers"
                            element={<MarketMoversPage/>}
                        />
                    </Routes>

                    <Footer />
                </div>
            </WatchlistProvider>
        </BrowserRouter>
    );
}

export default App;