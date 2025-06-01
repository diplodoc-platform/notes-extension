export const ENV_FLAG_NAME = 'has-yfm-notes';
export const DEFAULT_LANG = 'en';

type Lang = 'ru' | 'en' | 'ar' | 'cs' | 'fr' | 'es' | 'he' | 'bg' | 'et' | 'el' | 'pt' | 'zh' | 'zh-tw' | 'kk' | 'tr' | 'uz';

export const TITLES: Record<Lang, Record<string, string>> = {
    ru: {
        info: 'Примечание',
        tip: 'Совет',
        alert: 'Внимание',
        warning: 'Важно',
    },
    en: {
        info: 'Note',
        tip: 'Tip',
        alert: 'Alert',
        warning: 'Warning',
    },
    ar: {
        info: 'ملاحظة',
        tip: 'نصيحة',
        alert: 'انتباه',
        warning: 'هام',
    },
    cs: {
        info: 'Poznámka',
        tip: 'Tip',
        alert: 'Upozornění',
        warning: 'Varování',
    },
    fr: {
        info: 'Remarque',
        tip: 'Astuce',
        alert: 'Alerte',
        warning: 'Avertissement',
    },
    es: {
        info: 'Nota',
        tip: 'Consejo',
        alert: 'Alerta',
        warning: 'Aviso',
    },
    he: {
        info: 'מידע',
        tip: 'טיפ',
        alert: 'התראה',
        warning: 'אזהרה',
    },
    bg: {
        info: 'Забележка',
        tip: 'Съвет',
        alert: 'Внимание',
        warning: 'Важно',
    },
    et: {
        info: 'Märkus',
        tip: 'Nõuanne',
        alert: 'Tähelepanu',
        warning: 'Tähtis',
    },
    el: {
        info: 'Σημείωση',
        tip: 'Συμβουλή',
        alert: 'Προσοχή',
        warning: 'Σημαντικό',
    },
    pt: {
        info: 'Observação',
        tip: 'Sugestão',
        alert: 'Atenção',
        warning: 'Importante',
    },
    zh: {
        info: '备注',
        tip: '提示',
        alert: '注意',
        warning: '重要',
    },
    'zh-tw': {
        info: '備注',
        tip: '提示',
        alert: '注意',
        warning: '重要',
    },
    kk: {
        info: 'Ескерту',
        tip: 'Кеңес',
        alert: 'Назар аударыңыз',
        warning: 'Маңызды',
    },
    tr: {
        info: 'Not',
        tip: 'Öneri',
        alert: 'Dikkat',
        warning: 'Önemli',
    },
    uz: {
        info: 'Sharh',
        tip: 'Maslahat',
        alert: 'Diqqat',
        warning: 'Bu muhim',
    },
};

export const TokenType = {
    Note: 'yfm-note',
    NoteOpen: 'yfm_note_open',
    NoteClose: 'yfm_note_close',
    NoteTitleOpen: 'yfm_note_title_open',
    NoteTitleClose: 'yfm_note_title_close',
    NoteContentOpen: 'yfm_note_content_open',
    NoteContentClose: 'yfm_note_content_close'
} as const;

export const ClassNames = {
    Note: 'yfm-note',
    Accent: 'yfm-accent',
    Title: 'yfm-note-title',
    Content: 'yfm-note-content'
} as const;
