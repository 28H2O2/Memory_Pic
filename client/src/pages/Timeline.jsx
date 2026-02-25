/**
 * 功能：记忆时间线页面 — 相册的核心展示页面
 * 输入：通过路由参数获取 albumId，从 API 加载记忆列表
 * 输出：按时间排列的卡片式记忆展示，支持实时同步
 * 运行方式：路由组件，路径 /album/:id
 * 依赖：api.js, socket.io-client, MemoryCard组件
 * 项目作用：核心体验页面，展示所有记忆并支持共创
 * 最后修改：2026-02-25
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api, getUser } from '../utils/api';
import { showToast } from '../utils/toast';
import MemoryCard from '../components/MemoryCard';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Timeline() {
  const { id: albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [members, setMembers] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  const getMemoryDate = (memory) => {
    const d = new Date(memory.memory_date || memory.created_at);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  };

  const formatDayLabel = (date) => {
    const now = new Date();
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((nowStart - dateStart) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';

    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTimeLabel = (date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const sortedMemories = [...memories].sort((a, b) => getMemoryDate(b) - getMemoryDate(a));

  const groups = sortedMemories.reduce((acc, memory) => {
    const d = getMemoryDate(memory);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existed = acc.find(g => g.key === key);
    if (existed) {
      existed.items.push(memory);
    } else {
      acc.push({ key, date: d, items: [memory] });
    }
    return acc;
  }, []);

  const memoryRange = sortedMemories.length > 1
    ? `${getMemoryDate(sortedMemories[sortedMemories.length - 1]).toLocaleDateString('zh-CN')} - ${getMemoryDate(sortedMemories[0]).toLocaleDateString('zh-CN')}`
    : sortedMemories.length === 1
      ? getMemoryDate(sortedMemories[0]).toLocaleDateString('zh-CN')
      : '';

  useEffect(() => {
    loadData();
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_album', albumId);
        socketRef.current.disconnect();
      }
    };
  }, [albumId]);

  const loadData = async () => {
    try {
      const [albumData, memoriesData] = await Promise.all([
        api.getAlbum(albumId),
        api.getMemories(albumId)
      ]);
      setAlbum(albumData.album);
      setMembers(albumData.members);
      setMemories(memoriesData.memories);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_album', albumId);
    });

    socket.on('new_memory', (memory) => {
      // 不重复添加自己刚创建的
      setMemories(prev => {
        if (prev.some(m => m.id === memory.id)) return prev;
        return [memory, ...prev];
      });
      if (memory.user_id !== user?.id) {
        showToast(`${memory.author_name} 添加了一条新记忆 ✨`, 'success');
      }
    });

    socket.on('delete_memory', ({ id }) => {
      setMemories(prev => prev.filter(m => m.id !== id));
    });

    socket.on('update_memory', (updated) => {
      setMemories(prev => prev.map(m => m.id === updated.id ? updated : m));
    });
  };

  const handleUpdate = (updatedMemory) => {
    setMemories(prev => prev.map(m => m.id === updatedMemory.id ? updatedMemory : m));
  };

  const handleDelete = async (memoryId) => {
    try {
      await api.deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      showToast('已删除', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const copyInviteCode = async () => {
    if (!album) return;
    try {
      await navigator.clipboard.writeText(album.invite_code);
      setCopied(true);
      showToast('邀请码已复制！', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(`邀请码：${album.invite_code}`, 'info', 5000);
    }
  };

  if (loading) {
    return <div className="page loading-page"><div className="spinner" /></div>;
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(100px + var(--safe-bottom))' }}>
      {/* 顶部 */}
      <div className="page-header animate-in">
        <button className="back-btn" onClick={() => navigate('/albums')}>←</button>
        <h1 style={{ flex: 1 }}>{album?.name}</h1>
        <button
          onClick={() => setShowInfo(true)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem'
          }}
        >
          ℹ️
        </button>
      </div>

      {/* 成员头像条 */}
      <div className="animate-in" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        alignItems: 'center',
        animationDelay: '0.05s'
      }}>
        <div style={{ display: 'flex', marginRight: '4px' }}>
          {members.slice(0, 5).map((m, i) => (
            <div
              key={m.id}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `hsl(${(m.id * 67) % 360}, 60%, 50%)`,
                border: '2px solid var(--bg-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'white',
                marginLeft: i > 0 ? '-8px' : 0
              }}
              title={m.nickname}
            >
              {m.nickname.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {members.map(m => m.nickname).join('、')}
        </span>
      </div>

      {/* 时间线概览 */}
      {memories.length > 0 && (
        <div className="timeline-overview animate-in" style={{ animationDelay: '0.08s' }}>
          <div>
            <div className="timeline-overview-value">{memories.length}</div>
            <div className="timeline-overview-label">条记忆</div>
          </div>
          <div>
            <div className="timeline-overview-value">{groups.length}</div>
            <div className="timeline-overview-label">个时间节点</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="timeline-overview-value" style={{ fontSize: '0.95rem' }}>时间跨度</div>
            <div className="timeline-overview-label timeline-range">{memoryRange}</div>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      {memories.length === 0 ? (
        <div className="empty-state animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="emoji">🌟</div>
          <h3>还没有记忆</h3>
          <p>点击右下角的按钮，添加你们的第一条记忆吧</p>
        </div>
      ) : (
        <div className="timeline-list">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className="timeline-group animate-in"
              style={{ animationDelay: `${0.1 + groupIndex * 0.05}s` }}
            >
              <div className="timeline-group-header">
                <span className="timeline-group-dot" />
                <div>
                  <h3>{formatDayLabel(group.date)}</h3>
                  <p>{group.items.length} 条记忆</p>
                </div>
              </div>

              <div className="timeline-group-items">
                {group.items.map((memory, i) => (
                  <div key={memory.id} className="timeline-entry">
                    <div className="timeline-time">{formatTimeLabel(getMemoryDate(memory))}</div>
                    <MemoryCard
                      memory={memory}
                      index={i}
                      timelineMode
                      onUpdate={handleUpdate}
                      onDelete={
                        (memory.user_id === user?.id || members.find(m => m.id === user?.id)?.role === 'admin')
                          ? handleDelete
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 添加记忆按钮 */}
      <button
        className="fab"
        onClick={() => navigate(`/album/${albumId}/add`)}
      >
        +
      </button>

      {/* 相册信息弹窗 */}
      {showInfo && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInfo(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <h2>📸 相册信息</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '4px'
              }}>相册名称</label>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{album?.name}</div>
            </div>

            {album?.description && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginBottom: '4px'
                }}>描述</label>
                <div style={{ color: 'var(--text-secondary)' }}>{album.description}</div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>邀请码（分享给 ta 加入）</label>
              <button
                onClick={copyInviteCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  width: '100%',
                  color: 'var(--text-primary)'
                }}
              >
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  flex: 1,
                  textAlign: 'center',
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {album?.invite_code}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {copied ? '✅' : '复制'}
                </span>
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>成员 ({members.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 0'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: `hsl(${(m.id * 67) % 360}, 60%, 50%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'white'
                    }}>
                      {m.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{m.nickname}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.role === 'admin' ? '管理员' : '成员'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-secondary btn-full"
              onClick={() => setShowInfo(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
