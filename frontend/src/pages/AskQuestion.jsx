import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const AskQuestion = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddTag = (e) => {
    e.preventDefault();
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 5) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/questions', {
        title,
        body,
        tags
      });
      toast.success('Question posted successfully!');
      navigate('/qa');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Ask a Question</h1>
        <p style={{ color: 'var(--text-muted)' }}>Provide specific details so the community can help you better.</p>
      </div>

      <form onSubmit={handleSubmit} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Title */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Title</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Be specific and imagine you’re asking a question to another person.
          </p>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. How do I optimize a React app to avoid unnecessary re-renders?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={150}
          />
        </div>

        {/* Body */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Details</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Introduce the problem and expand on what you put in the title.
          </p>
          <textarea 
            className="input-field" 
            style={{ minHeight: '200px', resize: 'vertical' }}
            placeholder="Describe your context, what you've tried, and what you're stuck on..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Tags</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Add up to 5 tags to describe what your question is about (Press Enter to add).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {tags.map(tag => (
              <span key={tag} className="tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, marginTop: '2px' }}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. React, Interview, Frontend"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(e);
                }
              }}
              disabled={tags.length >= 5}
            />
            <button type="button" className="btn-secondary" onClick={handleAddTag} disabled={tags.length >= 5 || !currentTag.trim()}>
              Add
            </button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px 32px' }}>
            {loading ? 'Posting...' : 'Post Your Question'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AskQuestion;
