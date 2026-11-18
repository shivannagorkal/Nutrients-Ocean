import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Partners from './pages/Partners';
import DataCheck from './pages/DataCheck';
import Settings from './pages/Settings';
import { DateRangeProvider } from './context/DateRangeContext';

export default function App() {
  return (
    <DateRangeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/data-check" element={<DataCheck />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </DateRangeProvider>
  );
}

