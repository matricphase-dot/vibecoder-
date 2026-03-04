import React from 'react';
import Marketplace from './pages/Marketplace';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import ResetPassword from './pages/ResetPassword';
import MainApp from './MainApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<MainApp />} />
        <Route path="/marketplace" element={<Marketplace />} />
                <Route path='/reset-password' element={<ResetPassword />} />
        
    </BrowserRouter>
  );
}

export default App;


