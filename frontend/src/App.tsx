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

function App() {
    return (
        <BrowserRouter>
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
                </Routes>

                <Footer />
            </div>
        </BrowserRouter>
    );
}

export default App;