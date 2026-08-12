import React from 'react';
import { Sparkles } from 'lucide-react';

const STRINGS = {
  en: { title: 'Practice Round', message: 'Tap every tile that matches the picture shown at the bottom.', cta: 'Got it!' },
  he: { title: 'סבב אימון', message: 'הקש על כל אריח שתואם לתמונה המוצגת למטה.', cta: 'הבנתי!' },
  fr: { title: "Tour d'entraînement", message: "Touchez chaque tuile qui correspond à l'image affichée en bas.", cta: "J'ai compris !" },
  es: { title: 'Ronda de práctica', message: 'Toca cada ficha que coincida con la imagen mostrada abajo.', cta: '¡Entendido!' },
  ru: { title: 'Пробный раунд', message: 'Нажмите каждую плитку, которая совпадает с картинкой внизу.', cta: 'Понятно!' },
  zh: { title: '练习回合', message: '点击每一个与底部显示图片相符的方块。', cta: '明白了！' },
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
        <h3 className="text-xl font-bold mb-2">{t.title}</h3>
        <p className="mb-5 text-sm text-muted-foreground">{t.message}</p>
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