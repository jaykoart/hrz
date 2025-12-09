import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ko: { translation: ko },
            ja: { translation: ja },
            'zh-CN': { translation: zhCN },
            'zh-TW': { translation: zhTW },
            es: { translation: es },
            fr: { translation: fr },
            de: { translation: de },
            pt: { translation: pt },
            ru: { translation: ru },
            ar: { translation: ar },
            hi: { translation: hi }
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already safes from xss
        },
        detection: {
            order: ['navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage']
        }
    });

export default i18n;
