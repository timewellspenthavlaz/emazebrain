import React from 'react';
import { Button } from '@/components/ui/button';

const COPY = {
  en: {
    title: 'Tunnel Rush',
    body: 'Rotate the tunnel so the open gap reaches you when each gate arrives — arrow keys, swipe, or the on-screen buttons.',
    hint: 'Your first rotation launches the tunnel and starts the timer.',
    button: 'Got it!',
  },
  he: {
    title: 'טאנל ראש',
    body: 'סובבו את המנהרה כך שהפתח הפתוח יגיע אליכם כשהשער מתקרב — חצים במקלדת, החלקה או כפתורי המסך.',
    hint: 'הסיבוב הראשון מתחיל את המנהרה ואת הטיימר.',
    button: 'הבנתי!',
  },
  fr: {
    title: 'Tunnel Rush',
    body: 'Tournez le tunnel pour que l\u2019ouverture arrive face à vous à chaque porte — flèches, glissement ou boutons à l\u2019écran.',
    hint: 'Votre première rotation lance le tunnel et le chronomètre.',
    button: 'Compris !',
  },
  es: {
    title: 'Tunnel Rush',
    body: 'Gira el túnel para que la abertura llegue a ti en cada puerta — flechas, deslizar o los botones en pantalla.',
    hint: 'Tu primer giro lanza el túnel y el cronómetro.',
    button: '¡Entendido!',
  },
  ru: {
    title: 'Tunnel Rush',
    body: 'Поворачивайте туннель, чтобы открытый проём оказывался перед вами у каждых ворот — стрелки, свайп или экранные кнопки.',
    hint: 'Первый поворот запускает туннель и таймер.',
    button: 'Понятно!',
  },
  zh: {
    title: '隧道冲刺',
    body: '旋转隧道，让开口在每道门到达时正对你 — 使用方向键、滑动或屏幕按钮。',
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