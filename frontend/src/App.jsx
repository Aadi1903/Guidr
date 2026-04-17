import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QAFeed from './pages/QAFeed';
import AskQuestion from './pages/AskQuestion';
import Profile from './pages/Profile';
import QuestionDetail from './pages/QuestionDetail';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="container" style={{paddingTop: '100px', textAlign: 'center'}}>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Private Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/qa" 
          element={
             <PrivateRoute>
               <QAFeed />
             </PrivateRoute>
          } 
        />
        <Route 
          path="/ask" 
          element={
            <PrivateRoute>
              <AskQuestion />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/question/:id" 
          element={
            <PrivateRoute>
              <QuestionDetail />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
             <PrivateRoute>
               <Profile />
             </PrivateRoute>
          } 
        />
      </Route>
    </Routes>
  );
}

export default App;
