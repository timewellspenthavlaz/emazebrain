import React from 'react';
import { Sparkles } from 'lucide-react';

const STRINGS = {
  en: {
    title: 'Practice Round',
    bullets: [
      'This is a sample round to help you learn how to play.',
      'All the pictures are visible on the board.',
      'Tap every tile that matches the picture shown at the bottom.',
    ],
    cta: 'Got it!',
  },
  he: {
    title: 'סבב אימון',
    bullets: [
      'זהו סבב לדוגמה כדי לעזור לך ללמוד איך משחקים.',
      'כל התמונות גלויות על הלוח.',
      'הקש על כל אריח שתואם לתמונה המוצגת למטה.',
    ],
    cta: 'הבנתי!',
  },
  fr: {
    title: "Tour d'entraînement",
    bullets: [
      "Il s'agit d'un tour d'exemple pour vous apprendre à jouer.",
      'Toutes les images sont visibles sur le plateau.',
      "Touchez chaque tuile qui correspond à l'image affichée en bas.",
    ],
    cta: "J'ai compris !",
  },
  es: {
    title: 'Ronda de práctica',
    bullets: [
      'Esta es una ronda de ejemplo para ayudarte a aprender a jugar.',
      'Todas las imágenes son visibles en el tablero.',
      'Toca cada ficha que coincida con la imagen mostrada abajo.',
    ],
    cta: '¡Entendido!',
  },
  ru: {
    title: 'Пробный раунд',
    bullets: [
      'Это пробный раунд, чтобы помочь вам научиться играть.',
      'Все картинки видны на доске.',
      'Нажмите каждую плитку, которая совпадает с картинкой внизу.',
    ],
    cta: 'Понятно!',
  },
  zh: {
    title: '练习回合',
    bullets: [
      '这是一个示例回合，帮助你学习如何游玩。',
      '所有图片都在棋盘上可见。',
      '点击每一个与底部显示图片相符的方块。',
    ],
    cta: '明白了！',
  },
};

export default function InstructionsModal({ lang = 'en', onDismiss }) {
  const t = STRINGS[lang] || STRINGS.en;
  const isRtl = lang === 'he';
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-sm mx-4 rounded-2xl bg-card text-card-foreground shadow-2xl border border-white/10 p-6 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 mx-auto mb-4 shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-3">{t.title}</h3>
        <ul className="space-y-2 mb-5 text-sm text-muted-foreground text-start">
          {t.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-colors"
        >
          {t.cta}
        </button>
      </div>
    </div>
  );
}