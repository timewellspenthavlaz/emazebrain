import React from 'react';
import { Button } from '@/components/ui/button';

const COPY = {
  en: {
    title: 'Tunnel Rush',
    body: 'Steer left and right to dodge the floating objects — the rest of the tunnel is always open. Arrow keys, swipe, or the on-screen buttons.',
    hint: 'Your first rotation launches the tunnel and starts the timer.',
    button: 'Got it!',
  },
  he: {
    title: 'טאנל ראש',
    body: 'זזו שמאלה וימינה כדי לחמוק מהעצמים המרחפים — שאר המנהרה פתוחה תמיד. חצים במקלדת, החלקה או כפתורי המסך.',
    hint: 'הסיבוב הראשון מתחיל את המנהרה ואת הטיימר.',
    button: 'הבנתי!',
  },
  fr: {
    title: 'Tunnel Rush',
    body: 'Esquivez les objets flottants en vous déplaçant à gauche et à droite — le reste du tunnel est toujours ouvert. Flèches, glissement ou boutons à l\u2019écran.',
    hint: 'Votre première rotation lance le tunnel et le chronomètre.',
    button: 'Compris !',
  },
  es: {
    title: 'Tunnel Rush',
    body: 'Esquiva los objetos flotantes moviéndote a la izquierda y a la derecha — el resto del túnel siempre está abierto. Flechas, deslizar o los botones en pantalla.',
    hint: 'Tu primer giro lanza el túnel y el cronómetro.',
    button: '¡Entendido!',
  },
  ru: {
    title: 'Tunnel Rush',
    body: 'Уворачивайтесь от летящих навстречу объектов, двигаясь влево и вправо — остальная часть туннеля всегда открыта. Стрелки, свайп или экранные кнопки.',
    hint: 'Первый поворот запускает туннель и таймер.',
    button: 'Понятно!',
  },
  zh: {
    title: '隧道冲刺',
    body: '左右移动躲避迎面而来的漂浮物体 — 隧道的其余部分始终畅通。使用方向键、滑动或屏幕按钮。',
    hint: '第一次旋转将启动隧道和计时器。',
    button: '明白了！',
  },
};

/**
 * InstructionsModal — the suite's simplified reveal modal: title, one
 * instructional sentence, a control hint, and a single "Got it!" button.
 */
export default function InstructionsModal({ lang = 'en', colors, onStart }) {
  const copy = COPY[lang] || COPY.en;
  const rtl = lang === 'he';
  const glass = {
    background: 'rgba(18,24,38,0.78)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${colors.accent}33`,
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full rounded-2xl p-8 text-center" style={glass}>
        <h2 className="text-3xl font-bold mb-3" style={{ color: colors.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          {copy.title}
        </h2>
        <p className="text-sm leading-relaxed mb-1.5" style={{ color: colors.text }}>
          {copy.body}
        </p>
        <p className="text-xs mb-6" style={{ color: colors.muted }}>
          {copy.hint}
        </p>
        <Button
          onClick={onStart}
          size="lg"
          className="w-full text-sm font-semibold"
          style={{ background: colors.accent, color: colors.page === '#F1F5F9' ? '#FFFFFF' : '#090D16' }}
        >
          {copy.button}
        </Button>
      </div>
    </div>
  );
}