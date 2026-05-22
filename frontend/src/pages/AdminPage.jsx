import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiShieldCheckLine, RiUserLine, RiUserAddLine, RiDeleteBinLine,
  RiAdminLine, RiUserStarLine, RiVerifiedBadgeFill, RiSearchLine,
  RiAddLine, RiCloseLine, RiGroupLine, RiShieldStarLine,
  RiArrowLeftSLine, RiArrowRightSLine, RiRefreshLine,
  RiCalendarLine, RiEyeLine, RiEyeOffLine,
} from 'react-icons/ri';
import useAuthStore from '../store/authStore';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import './AdminPage.css';

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', username: '', email: '', password: '', role: 'user' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/admin/users', form);
      toast.success(data.message || 'User created!');
      onCreated(data.user);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <h2><RiUserAddLine style={{ color: '#7c5cff' }} /> Add New User</h2>
        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="admin-modal-field">
            <label className="admin-modal-label">Full Name</label>
            <input className="admin-modal-input" placeholder="John Doe" required
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="admin-modal-field">
            <label className="admin-modal-label">Username</label>
            <input className="admin-modal-input" placeholder="johndoe" required minLength={3}
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} />
          </div>
          <div className="admin-modal-field">
            <label className="admin-modal-label">Email</label>
            <input className="admin-modal-input" type="email" placeholder="john@example.com" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="admin-modal-field">
            <label className="admin-modal-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="admin-modal-input" type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters" required minLength={6} style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, display: 'flex' }}>
                {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
          </div>
          <div className="admin-modal-field">
            <label className="admin-modal-label">Role</label>
            <select className="admin-modal-select"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-modal-submit" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><RiAddLine /> Create User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmModal({ user, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" style={{ maxWidth: 360 }}>
        <h2 style={{ color: '#f87171' }}><RiDeleteBinLine /> Delete User</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Are you sure you want to delete <strong style={{ color: '#fff' }}>{user.name}</strong> (@{user.username})?
          This action <strong style={{ color: '#f87171' }}>cannot be undone</strong>.
        </p>
        <div className="admin-modal-actions">
          <button className="admin-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="admin-modal-submit" onClick={handleConfirm} disabled={loading}
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><RiDeleteBinLine /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: me } = useAuthStore();
  const navigate     = useNavigate();

  const [users, setUsers]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (me && me.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [me]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/stats');
      setStats(data.stats);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/users', { params: { search, page, limit: 15 } });
      setUsers(data.users);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search, page]);

  // ── Actions ────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      const { data } = await API.delete(`/admin/users/${deleteTarget._id}`);
      toast.success(data.message);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setTotal((t) => t - 1);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleteTarget(null); }
  };

  const handleRoleToggle = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      const { data } = await API.put(`/admin/users/${u._id}/role`, { role: newRole });
      toast.success(data.message);
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, role: newRole } : x));
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleVerify = async (u) => {
    try {
      const { data } = await API.put(`/admin/users/${u._id}/verify`);
      toast.success(data.message);
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isVerified: !x.isVerified } : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreated = (newUser) => {
    setUsers((prev) => [newUser, ...prev]);
    setTotal((t) => t + 1);
    fetchStats();
  };

  if (!me || me.role !== 'admin') return null;

  return (
    <div className="admin-page">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>⚡ Admin Panel</h1>
          <p>Manage all users — approve, promote, and remove accounts</p>
        </div>
        <button
          className="action-btn"
          onClick={() => { fetchUsers(); fetchStats(); }}
          title="Refresh"
          style={{ width: 38, height: 38, borderRadius: 10, fontSize: 17 }}
        >
          <RiRefreshLine />
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="admin-stats">
        <div className="stat-card purple">
          <RiGroupLine className="stat-icon" />
          <div className="stat-value">{stats?.total ?? '—'}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card cyan">
          <RiShieldStarLine className="stat-icon" />
          <div className="stat-value">{stats?.admins ?? '—'}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card green">
          <RiVerifiedBadgeFill className="stat-icon" />
          <div className="stat-value">{stats?.verified ?? '—'}</div>
          <div className="stat-label">Verified</div>
        </div>
        <div className="stat-card orange">
          <RiCalendarLine className="stat-icon" />
          <div className="stat-value">{stats?.newToday ?? '—'}</div>
          <div className="stat-label">New Today</div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <RiSearchLine className="admin-search-icon" />
          <input
            className="admin-search"
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button className="admin-add-btn" onClick={() => setShowCreate(true)}>
          <RiAddLine /> Add User
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">
            <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <RiUserLine style={{ fontSize: 40, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
            No users found
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u._id === me._id;
                return (
                  <tr key={u._id}>
                    {/* User cell */}
                    <td>
                      <div className="admin-user-cell">
                        {u.avatar
                          ? <img src={u.avatar} alt={u.name} className="admin-avatar" />
                          : <div className="admin-avatar-placeholder">{u.name?.charAt(0)?.toUpperCase()}</div>
                        }
                        <div>
                          <div className="admin-user-name">
                            {u.name}
                            {isMe && <span style={{ fontSize: 10, background: 'rgba(124,92,255,0.2)', color: '#a78bfa', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>You</span>}
                          </div>
                          <div className="admin-user-username">@{u.username} · {u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? <RiShieldCheckLine /> : <RiUserLine />} {u.role}
                      </span>
                    </td>

                    {/* Verified */}
                    <td>
                      <span className={`verify-badge ${u.isVerified ? 'yes' : 'no'}`}>
                        {u.isVerified ? <><RiVerifiedBadgeFill /> Yes</> : 'No'}
                      </span>
                    </td>

                    {/* Joined */}
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="admin-actions">
                        {/* Verify toggle */}
                        <button
                          className={`action-btn verify-btn${isMe ? ' me-btn' : ''}`}
                          onClick={() => !isMe && handleVerify(u)}
                          title={u.isVerified ? 'Remove verification' : 'Verify account'}
                        >
                          <RiVerifiedBadgeFill />
                        </button>

                        {/* Role toggle */}
                        <button
                          className={`action-btn ${u.role === 'admin' ? 'demote-btn' : 'promote-btn'}${isMe ? ' me-btn' : ''}`}
                          onClick={() => !isMe && handleRoleToggle(u)}
                          title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        >
                          {u.role === 'admin' ? <RiUserLine /> : <RiShieldCheckLine />}
                        </button>

                        {/* Delete */}
                        <button
                          className={`action-btn delete-btn${isMe ? ' me-btn' : ''}`}
                          onClick={() => !isMe && setDeleteTarget(u)}
                          title="Delete user"
                        >
                          <RiDeleteBinLine />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="admin-pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <RiArrowLeftSLine />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`dot-${p}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
                  )}
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                </>
              ))
            }
            <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              <RiArrowRightSLine />
            </button>
          </div>
        )}
      </div>

      {/* Total count */}
      {!loading && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          Showing {users.length} of {total} users
        </p>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {deleteTarget && <ConfirmModal user={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
