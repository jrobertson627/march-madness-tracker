import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InitialSearch from './pages/initial-search/initial-search';
import Compare from './pages/compare/compare';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<InitialSearch />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
    </Router>
  );
};

export default App;