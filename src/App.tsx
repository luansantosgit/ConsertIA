import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar, Header } from '@/components';
import { Dashboard, Customers } from '@/pages';
import './i18n/config';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col lg:ml-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/atendimento" element={<Dashboard />} />
              <Route path="/ordens" element={<Dashboard />} />
              <Route path="/estoque" element={<Dashboard />} />
              <Route path="/financeiro" element={<Dashboard />} />
              <Route path="/agenda" element={<Dashboard />} />
              <Route path="/relatorios" element={<Dashboard />} />
              <Route path="/configuracoes" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
