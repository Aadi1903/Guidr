import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { MessageSquare, Search, Tag, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const QAFeed = () => {
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const availableTags = ['DSA', 'Resume', 'Interview', 'Career', 'Other'];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = '/questions?';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (tagFilter) query += `tag=${encodeURIComponent(tagFilter)}&`;

      const res = await apiClient.get(query);
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [tagFilter]); // Auto-search on tag change

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Q&A Feed</h1>
          <p style={{ color: 'var(--text-muted)' }}>Browse questions or share your expertise.</p>
        </div>
        <Link to="/ask" className="btn-primary">Ask a Question</Link>
      </div>

      {/* Filters & Search */}
      <div className="card glass-panel" style={{ marginBottom: '32px', padding: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search questions..."
              style={{ paddingLeft: '44px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '0 24px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '8px' }}>Filter by:</span>
          <button 
            className={`tag ${tagFilter === '' ? 'active' : ''}`}
            style={{ cursor: 'pointer', background: tagFilter === '' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: tagFilter === '' ? 'white' : 'var(--text-main)' }}
            onClick={() => setTagFilter('')}
          >
            All
          </button>
          {availableTags.map(tag => (
            <button 
              key={tag}
              className={`tag ${tagFilter === tag ? 'active' : ''}`}
              style={{ cursor: 'pointer', background: tagFilter === tag ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: tagFilter === tag ? 'white' : 'var(--text-main)' }}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="card glass-panel" style={{ textAlign: 'center', padding: '60px 0' }}>
          <MessageSquare size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No questions found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Be the first to ask a question in this category!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {questions.map(q => (
            <div key={q.questionId} className="card glass-panel" style={{ transition: 'transform 0.2s', padding: '24px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                {/* Stats column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', gap: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>{q.answerCount || 0}</div>
                    <div style={{ fontSize: '0.8rem' }}>answers</div>
                  </div>
                </div>

                {/* Content column */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>
                    <Link to={`/question/${q.questionId}`} style={{ color: 'var(--text-main)' }}>
                      {q.title}
                    </Link>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {q.body}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {q.tags?.map(t => (
                        <span key={t} className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'none' }}>{t}</span>
                      ))}
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Asked on {format(new Date(q.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QAFeed;
