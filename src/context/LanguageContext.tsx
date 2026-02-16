import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, TranslationKey, translations } from '../i18n/translations';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('ja'); // Default to Japanese as requested

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('userLanguage');
            if (savedLanguage === 'en' || savedLanguage === 'ja') {
                setLanguageState(savedLanguage);
            }
        } catch (e) {
            console.error('Failed to load language', e);
        }
    };

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        try {
            await AsyncStorage.setItem('userLanguage', lang);
        } catch (e) {
            console.error('Failed to save language', e);
        }
    };

    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                text = text.replace(`{{${param}}}`, String(params[param]));
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguageContext = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguageContext must be used within a LanguageProvider');
    }
    return context;
};
