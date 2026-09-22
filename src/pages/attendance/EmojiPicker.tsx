import React, { useState } from 'react';

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

/** Curadoria leve (sem lib externa): faces, gestos, coracoes, ferramentas e simbolos */
const CATEGORIES: { key: string; label: string; emojis: string[] }[] = [
  {
    key: 'faces',
    label: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '🤗', '🤭', '🤫', '🤔', '🤐',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤',
      '😴', '😷', '🤒', '🤕', '🤢', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎',
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
      '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
      '🥱', '😤', '😡', '🤬', '💀', '💩', '🤡', '👻', '👽', '🤖',
    ],
  },
  {
    key: 'gestures',
    label: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '✍️', '💅',
    ],
  },
  {
    key: 'hearts',
    label: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '✨', '⭐', '🌟', '💫', '⚡',
      '🔥', '💥', '💯', '✅', '❌', '❗', '❓', '⚠️', '🔔', '🎉', '🎊', '🥇',
    ],
  },
  {
    key: 'tools',
    label: '🔧',
    emojis: [
      '🔧', '🔨', '🛠️', '⚙️', '🔩', '🪛', '🔌', '🔋', '💡', '📱', '💻', '🖥️',
      '⌨️', '🖱️', '🖨️', '📷', '🎥', '🎧', '📻', '📺', '📡', '🧲', '🔑', '🔒',
      '🧰', '📐', '📏', '💰', '💳', '🧾', '📅', '⏰', '🚗', '🛵', '📦', '🏷️',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onPick }) => {
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const active = CATEGORIES.find(c => c.key === category) ?? CATEGORIES[0];

  return (
    <div
      className="card"
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: 8,
        width: 296,
        padding: 0,
        overflow: 'hidden',
        zIndex: 100,
        animation: 'slideUp 0.15s ease',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            title={c.key}
            style={{
              flex: 1,
              padding: '8px 0',
              background: c.key === category ? 'var(--primary-light)' : 'none',
              border: 'none',
              borderBottom: c.key === category ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.12s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: 8, maxHeight: 216, overflowY: 'auto' }}>
        {active.emojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            style={{
              fontSize: '1.125rem',
              padding: '4px 0',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
