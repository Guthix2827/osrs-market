import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ItemPage from "./pages/ItemPage";

function App() {
  return (
      <BrowserRouter>
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
      </BrowserRouter>
  );
}

export default App;