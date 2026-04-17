import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { ThumbsUp, User, ArrowLeft, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const QuestionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New answer state
  const [newAnswer, setNewAnswer] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, aRes] = await Promise.all([
          apiClient.get(`/questions/${id}`),
          apiClient.get(`/answers?questionId=${id}`)
        ]);
        setQuestion(qRes.data);
        setAnswers(aRes.data.answers || []);
      } catch (err) {
        toast.error('Failed to load question details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    setPosting(true);
    try {
      const res = await apiClient.post('/answers', {
        questionId: id,
        body: newAnswer
      });
      
      // Update local state without full reload
      setAnswers([...answers, res.data.answer].sort((a,b) => b.upvotes - a.upvotes || new Date(a.createdAt) - new Date(b.createdAt)));
      setQuestion(prev => ({...prev, answerCount: prev.answerCount + 1}));
      setNewAnswer('');
      toast.success('Answer posted successfully!');
    } catch (err) {
      toast.error('Failed to post answer');
    } finally {
      setPosting(false);
    }
  };

  const handleUpvote = async (answerId) => {
    try {
      const res = await apiClient.put(`/answers/${answerId}/upvote`);
      // Update local state
      setAnswers(answers.map(a => 
        a.answerId === answerId 
          ? { ...a, upvotes: res.data.upvotes, upvotedBy: [...(a.upvotedBy || []), user.userId] } 
          : a
      ).sort((a,b) => b.upvotes - a.upvotes || new Date(a.createdAt) - new Date(b.createdAt)));
      toast.success('Upvoted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upvote');
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>Loading question...</div>;
  if (!question) return <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>Question not found.</div>;

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <Link to="/qa" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: 'var(--text-muted)' }}>
        <ArrowLeft size={16} /> Back to Q&A
      </Link>

      {/* Question Card */}
      <div className="card glass-panel" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.3 }}>{question.title}</h1>
        </div>
        
        <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1.1rem' }}>{question.body}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {question.tags?.map(t => (
              <span key={t} className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'none' }}>{t}</span>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> {question.authorEmail || 'Anonymous'}
            </span>
            <span>•</span>
            <span>{format(new Date(question.createdAt), 'MMM dd, yyyy - h:mm a')}</span>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {question.answerCount || 0} Answers
      </h3>

      {/* Answer List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {answers.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
             <MessageSquare size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
             <p style={{ color: 'var(--text-muted)' }}>No answers yet. Be the first to help out!</p>
           </div>
        ) : (
          answers.map(a => {
            const hasUpvoted = a.upvotedBy?.includes(user?.userId);
            const isOwnAnswer = a.authorId === user?.userId;

            return (
              <div key={a.answerId} className="card glass-panel" style={{ padding: '24px', display: 'flex', gap: '20px' }}>
                {/* Vote column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => handleUpvote(a.answerId)}
                    disabled={hasUpvoted || isOwnAnswer}
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: hasUpvoted ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${hasUpvoted ? 'var(--primary)' : 'var(--border)'}`,
                      color: hasUpvoted ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: (hasUpvoted || isOwnAnswer) ? 'not-allowed' : 'pointer'
                    }}
                    title={isOwnAnswer ? "Can't upvote own answer" : hasUpvoted ? "Already upvoted" : "Upvote"}
                  >
                    <ThumbsUp size={18} fill={hasUpvoted ? 'currentColor' : 'none'} />
                  </button>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: hasUpvoted ? 'var(--primary-light)' : 'var(--text-main)' }}>
                    {a.upvotes || 0}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: '20px' }}>{a.body}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <p style={{ marginBottom: '4px' }}>Answered {format(new Date(a.createdAt), 'MMM dd, yyyy')}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-light)' }}>
                        <User size={14} /> {a.authorEmail || 'Anonymous'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Post Answer Form */}
      <div className="card glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Your Answer</h3>
        <form onSubmit={handlePostAnswer}>
          <textarea 
            className="input-field" 
            style={{ minHeight: '150px', resize: 'vertical', marginBottom: '16px' }}
            placeholder="Write your answer here..."
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={posting || !newAnswer.trim()}>
              {posting ? 'Posting...' : 'Post Answer'}
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
};

export default QuestionDetail;
