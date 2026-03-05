import React from "react";
import Marketplace from "./pages/Marketplace";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Privacy from "./pages/Privacy";

import AdminBetaSignups from "./pages/AdminBetaSignups";
import MainApp from "./MainApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<MainApp />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/beta" element={<BetaSignup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
