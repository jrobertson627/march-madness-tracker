import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AppShell from './components/app-shell/app-shell';
import { useWarmUp } from './hooks/useWarmUp';
import BacktestPage from './pages/backtest/backtest';
import BracketPage from './pages/bracket/bracket';
import Compare from './pages/compare/compare';
import InitialSearch from './pages/initial-search/initial-search';

const App: React.FC = () => {
  useWarmUp();
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="/welcome" element={<InitialSearch />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/bracket" element={<BracketPage />} />
          <Route path="/bracket/:season" element={<BracketPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;
