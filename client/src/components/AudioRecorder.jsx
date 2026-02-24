/**
 * 功能：音频录制组件 — 使用 MediaRecorder API 在浏览器中录音
 * 输入：用户点击录音按钮
 * 输出：录音完成后回调 onRecorded(blob) 返回音频 Blob
 * 运行方式：由 AddMemory 页面引入
 * 依赖：无外部依赖
 * 项目作用：核心交互组件，让用户为记忆配上语音
 * 最后修改：2026-02-25
 */

import { useState, useRef } from 'react';

export default function AudioRecorder({ onRecorded, audioBlob }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        onRecorded(blob);
        stream.getTracks().forEach(track => track.stop());
        clearInterval(timerRef.current);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('无法访问麦克风，请检查浏览器权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const removeRecording = () => {
    onRecorded(null);
    setDuration(0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '16px',
    }}>
      {!recording && !audioBlob && (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            width: '100%'
          }}
        >
          <span style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(232, 101, 122, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0
          }}>
            🎙️
          </span>
          点击录制语音
        </button>
      )}

      {recording && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={stopRecording}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'pulse 1.5s infinite'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              background: 'white'
            }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              正在录音...
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatTime(duration)}
            </div>
          </div>
          {/* 波形动画 */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '24px' }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  borderRadius: '2px',
                  background: 'var(--primary)',
                  animation: `wave 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                  height: '100%'
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes wave {
              0%, 100% { transform: scaleY(0.3); }
              50% { transform: scaleY(1); }
            }
          `}</style>
        </div>
      )}

      {!recording && audioBlob && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <audio
            controls
            src={URL.createObjectURL(audioBlob)}
            style={{ flex: 1, height: '36px' }}
          />
          <button
            type="button"
            onClick={removeRecording}
            style={{
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
