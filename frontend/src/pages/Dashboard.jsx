import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { MessageSquare, ThumbsUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myQuestions, setMyQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch profile
        const profileRes = await apiClient.get('/auth/me');
        setProfile(profileRes.data);

        // Fetch my questions (assuming API supports authorId filter)
        const qRes = await apiClient.get(`/questions?authorId=${user.userId}`);
        setMyQuestions(qRes.data.questions || []);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) return <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="container">
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome back, {profile?.name || 'User'}!</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Here's what's happening in your network today.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity color="var(--primary-light)" size={28} />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Role</h4>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize' }}>{profile?.role || 'user'}</p>
          </div>
        </div>

        <div className="card glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare color="#34d399" size={28} />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>My Questions</h4>
            <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{myQuestions.length}</p>
          </div>
        </div>
      </div>

      <div className="card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Recent Questions</h2>
          <Link to="/ask" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Ask New</Link>
        </div>

        {myQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            You haven't asked any questions yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myQuestions.slice(0, 5).map(q => (
              <div key={q.questionId} style={{ 
                padding: '20px', 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>{q.title}</h3>
                  <span className="tag">{q.tags?.[0] || 'General'}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={14} /> {q.answerCount || 0} Answers
                  </span>
                  <span>{format(new Date(q.createdAt), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
