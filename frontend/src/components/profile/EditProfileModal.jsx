import { useState } from 'react';
import { RiCloseLine, RiImageLine } from 'react-icons/ri';
import { useDropzone } from 'react-dropzone';
import useAuthStore from '../../store/authStore';
import API from '../../utils/api';
import { compressImage } from '../../utils/imageCompressor';
import toast from 'react-hot-toast';
import './EditProfileModal.css';

export default function EditProfileModal({ user, onClose, onSave }) {
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    website: user.website || '',
    location: user.location || '',
    avatar: user.avatar || '',
    coverImage: user.coverImage || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || '');

  const { getRootProps: getAvatarProps, getInputProps: getAvatarInput } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: async (files) => {
      if (!files[0]) return;
      
      let uploadFile = files[0];
      if (uploadFile.type.startsWith('image/')) {
        try {
          // Compress avatar to an optimal mobile square resolution (400x400 px)
          uploadFile = await compressImage(uploadFile, 400, 400, 0.85);
        } catch (err) {
          console.error('Avatar compression failed, uploading original:', err);
        }
      }

      setAvatarPreview(URL.createObjectURL(uploadFile));
      const formData = new FormData();
      formData.append('avatar', uploadFile);
      try {
        const { data } = await API.post('/upload/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setForm((f) => ({ ...f, avatar: data.url }));
        toast.success('Avatar uploaded!');
      } catch {
        toast.error('Failed to upload avatar');
      }
    },
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data } = await API.put('/users/profile/update', form);
      updateUser(data.user);
      onSave(data.user);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="btn-icon modal-close" onClick={onClose}><RiCloseLine /></button>
        </div>

        <div className="modal-body">
          {/* Avatar upload */}
          <div className="avatar-upload-section" {...getAvatarProps()}>
            <input {...getAvatarInput()} />
            <div className="avatar-upload-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar avatar-2xl" />
              ) : (
                <div className="avatar-placeholder avatar-2xl" style={{ fontSize: 28 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="avatar-upload-overlay">
                <RiImageLine />
                <span>Change</span>
              </div>
            </div>
          </div>

          <div className="modal-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={50} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={200} rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="input" value={form.website} placeholder="https://yoursite.com" onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="input" value={form.location} placeholder="City, Country" onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
