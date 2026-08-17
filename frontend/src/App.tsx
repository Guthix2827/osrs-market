import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ItemPage from "./pages/ItemPage";
import { Header } from "./components/Header.tsx";
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
                        path="/"
                        element={
                            <Navigate
                                to="/items/6739"
                                replace
                            />
                        }
                    />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;