import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ThemeProvider, useTheme } from './ThemeContext';
import Dashboard from './Dashboard';
import Scans from './Scans';
import Alerts from './Alerts';
import Settings from './Settings';
import Sectors from './Sectors';
import InstitutionalChanges from './InstitutionalChanges';
import IndianStocks from './IndianStocks';
import Sidebar from './components/Sidebar';
import PwaInstallButton from './components/PwaInstallButton';

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Router>
      <div className="app" data-theme={theme}>
        <Sidebar
          isDarkTheme={theme === 'dark'}
          onToggleTheme={toggleTheme}
        />
        <PwaInstallButton />
        
        <div className="app-content">
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scans" element={<Scans />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/india-stocks" element={<IndianStocks />} />
              <Route path="/institutional-changes" element={<InstitutionalChanges />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <AppContent />
    </ThemeProvider>
  );
};

export default App;
