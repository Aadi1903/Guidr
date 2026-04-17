import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { User, Briefcase, BookOpen, Star, Mail, Edit2, Save, X } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        setProfile(res.data);
        setFormData(res.data);
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/users/${user.userId}`, formData);
      setProfile(formData);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isProfessional = profile?.role === 'professional';

  if (loading) return <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>Loading profile...</div>;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      
      {/* Header section */}
      <div className="card glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0, marginBottom: '24px' }}>
        <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}></div>
        
        <div style={{ padding: '0 32px 32px', position: 'relative' }}>
          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-card)', 
            border: '4px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: '-50px', marginBottom: '16px', position: 'relative', zIndex: 10
          }}>
            <User size={48} color="var(--primary-light)" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>{profile?.name}</h1>
              <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Mail size={16} /> {profile?.email}
              </p>
              <span className="tag" style={{ textTransform: 'capitalize' }}>{profile?.role}</span>
            </div>
            
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details section */}
      <div className="card glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Personal Information</h2>
          {editing && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setEditing(false); setFormData(profile); }} 
                className="btn-secondary" 
                style={{ padding: '8px 16px', color: 'var(--bg-dark)', background: '#ef4444' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="btn-primary" 
                disabled={saving}
                style={{ padding: '8px 16px' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* Common Fields */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Full Name</label>
            {editing ? (
              <input type="text" name="name" className="input-field" value={formData.name || ''} onChange={handleChange} />
            ) : (
              <p style={{ fontSize: '1.1rem' }}>{profile?.name || 'Not set'}</p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bio</label>
            {editing ? (
              <textarea name="bio" className="input-field" value={formData.bio || ''} onChange={handleChange} style={{minHeight: '80px'}} />
            ) : (
              <p style={{ fontSize: '1.1rem' }}>{profile?.bio || 'No bio provided.'}</p>
            )}
          </div>

          {/* Role Specific Fields */}
          {isProfessional ? (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Company</label>
                {editing ? (
                  <input type="text" name="company" className="input-field" value={formData.company || ''} onChange={handleChange} />
                ) : (
                  <p style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={18} color="var(--primary-light)"/> {profile?.company || 'Not set'}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Experience (Years)</label>
                {editing ? (
                  <input type="text" name="experience" className="input-field" value={formData.experience || ''} onChange={handleChange} />
                ) : (
                  <p style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={18} color="#f59e0b"/> {profile?.experience ? `${profile.experience} years` : 'Not set'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>College / University</label>
                {editing ? (
                  <input type="text" name="college" className="input-field" value={formData.college || ''} onChange={handleChange} />
                ) : (
                  <p style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} color="#3b82f6"/> {profile?.college || 'Not set'}
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Skills / Interests</label>
                {editing ? (
                  <input type="text" name="skills" className="input-field" placeholder="React, Node, Product Management..." value={formData.skills || ''} onChange={handleChange} />
                ) : (
                  <p style={{ fontSize: '1.1rem' }}>{profile?.skills || 'Not set'}</p>
                )}
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Profile;
