import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InitialSearch from './pages/initial-search/initial-search';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<InitialSearch />} />
      </Routes>
    </Router>
  );
};

export default App;