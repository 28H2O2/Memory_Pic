/**
 * 功能：相册列表页面 — 展示所有相册、创建新相册、加入相册
 * 输入：从 API 获取用户所有相册
 * 输出：渲染相册卡片列表
 * 运行方式：路由组件，路径 /albums
 * 依赖：api.js, toast.js
 * 项目作用：用户登录后的主页面
 * 最后修改：2026-02-25
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, logout } from '../utils/api';
import { showToast } from '../utils/toast';

export default function Albums() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      const data = await api.getAlbums();
      setAlbums(data.albums);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!albumName.trim()) return;
    setSubmitting(true);
    try {
      const data = await api.createAlbum(albumName.trim(), albumDesc.trim());
      showToast('相册创建成功！邀请码：' + data.album.invite_code, 'success', 4000);
      setAlbums(prev => [{ ...data.album, memory_count: 0, member_count: 1, role: 'admin' }, ...prev]);
      setShowCreate(false);
      setAlbumName('');
      setAlbumDesc('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    try {
      const data = await api.joinAlbum(inviteCode.trim());
      showToast('成功加入相册「' + data.album.name + '」🎉', 'success');
      setShowJoin(false);
      setInviteCode('');
      loadAlbums();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page loading-page"><div className="spinner" /></div>;
  }

  return (
    <div className="page">
      {/* 顶部 */}
      <div className="animate-in" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingTop: '8px'
      }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hi, {user?.nickname || '朋友'} 👋
          </p>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            我们的回忆
          </h1>
        </div>
        <button
          onClick={logout}
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            padding: '8px'
          }}
        >
          退出
        </button>
      </div>

      {/* 操作按钮 */}
      <div className="animate-in" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '28px',
        animationDelay: '0.05s'
      }}>
        <button
          className="btn btn-primary btn-small"
          style={{ flex: 1 }}
          onClick={() => setShowCreate(true)}
        >
          ✨ 创建相册
        </button>
        <button
          className="btn btn-secondary btn-small"
          style={{ flex: 1 }}
          onClick={() => setShowJoin(true)}
        >
          🔗 加入相册
        </button>
      </div>

      {/* 相册列表 */}
      {albums.length === 0 ? (
        <div className="empty-state animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="emoji">💝</div>
          <h3>还没有相册</h3>
          <p>创建一个新相册，邀请 ta 一起记录你们的美好回忆吧</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {albums.map((album, i) => (
            <button
              key={album.id}
              className="card animate-in"
              onClick={() => navigate(`/album/${album.id}`)}
              style={{
                animationDelay: `${0.1 + i * 0.06}s`,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
                    {album.name}
                  </h3>
                  {album.description && (
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      marginBottom: '12px',
                      lineHeight: 1.4
                    }}>
                      {album.description}
                    </p>
                  )}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span>📸 {album.memory_count} 条记忆</span>
                    <span>👥 {album.member_count} 人</span>
                  </div>
                </div>
                <div style={{
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                  paddingLeft: '12px'
                }}>
                  →
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 创建相册弹窗 */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2>✨ 创建新相册</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>相册名称</label>
                <input
                  className="input"
                  placeholder="给相册取个名字"
                  value={albumName}
                  onChange={e => setAlbumName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>描述（可选）</label>
                <input
                  className="input"
                  placeholder="记录些什么内容呢"
                  value={albumDesc}
                  onChange={e => setAlbumDesc(e.target.value)}
                  maxLength={100}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || !albumName.trim()}
              >
                {submitting ? <span className="spinner" /> : '创建'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 加入相册弹窗 */}
      {showJoin && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowJoin(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2>🔗 加入相册</h2>
            <form onSubmit={handleJoin}>
              <div className="input-group">
                <label>邀请码</label>
                <input
                  className="input"
                  placeholder="输入 6 位邀请码"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                  style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '0.3em'
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || inviteCode.trim().length < 6}
              >
                {submitting ? <span className="spinner" /> : '加入'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
