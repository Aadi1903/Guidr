import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, MessageSquare, Briefcase, Zap } from 'lucide-react';

const Home = () => {
  return (
    <div className="container">
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '80px 0 60px', position: 'relative' }}>
        <div style={{ display: 'inline-block', marginBottom: '24px' }}>
          <span className="tag" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} color="var(--primary)" /> 
            <span>Welcome to the future of mentorship</span>
          </span>
        </div>
        
        <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-1px' }}>
          Accelerate your career with <br/>
          <span className="text-gradient">expert guidance.</span>
        </h1>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Connect with industry professionals, ask burning questions, and get the insights you need to land your dream role.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/signup" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
            Start Your Journey <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
            I already have an account
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          
          <div className="card glass-panel">
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <MessageSquare color="var(--primary-light)" size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Structured Q&A</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Ask targeted questions about DSA, Resumes, or specific companies. Get profound answers from verified professionals.
            </p>
          </div>

          <div className="card glass-panel">
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Users color="var(--secondary)" size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Verified Professionals</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Learn directly from engineers, PMs, and recruiters working at top tech companies worldwide.
            </p>
          </div>

          <div className="card glass-panel">
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Briefcase color="#34d399" size={24} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Career Velocity</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Build a reputation, showcase your knowledge, and accelerate your career trajectory through community mentorship.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Home;
