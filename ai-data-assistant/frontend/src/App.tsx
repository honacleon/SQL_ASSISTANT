import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { healthCheck } from './services/api';
import toast from 'react-hot-toast';

function App() {
  // Check API connection on startup
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await healthCheck();
        console.log('✅ API connection established');
      } catch (error) {
        console.error('❌ API connection failed:', error);
        toast.error(
          'Não foi possível conectar com o servidor. Verifique se o backend está rodando.',
          { duration: 6000 }
        );
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;