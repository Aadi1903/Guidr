import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <main style={{ flex: 1, padding: '40px 0', position: 'relative' }}>
        {/* Abstract background blobs for premium feel */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(15,15,26,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(15,15,26,0) 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} />
        
        <Outlet />
      </main>
      
      <footer style={{
        marginTop: 'auto',
        padding: '30px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="container">
          <p>© {new Date().getFullYear()} Guidr. Empowering the next generation.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
