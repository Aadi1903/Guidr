import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, Menu, X, LogOut, User as UserIcon } from 'lucide-react';

const Navigation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinks = user
    ? [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Q&A Feed', path: '/qa' },
        { name: 'Ask a Question', path: '/ask' },
      ]
    : [];

  return (
    <nav style={{
      background: 'rgba(26, 26, 46, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 0'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 101 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)'
          }}>
            <Layers size={24} color="white" />
          </div>
          <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
            Guidr
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
          <div style={{ display: 'flex', gap: '24px' }}>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                style={{
                  color: location.pathname === link.path ? 'var(--primary-light)' : 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
            {user ? (
              <>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 500 }}>
                  <div style={{
                     width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <UserIcon size={18} color="white" />
                  </div>
                  <span style={{ fontSize: '0.95rem' }}>Profile</span>
                </Link>
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.95rem' }}>Log in</Link>
                <Link to="/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.95rem' }}>Get Started</Link>
              </>
            )}
          </div>
        </div>

      </div>
      
      {/* Basic responsive hiding directly inline for simplicity since media queries need css */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;
