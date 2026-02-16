import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isGuest: boolean;
    isLoading: boolean;
    enterGuestMode: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isGuest: false,
    isLoading: true,
    enterGuestMode: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            checkGuestMode(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) {
                setIsGuest(false);
                AsyncStorage.removeItem('isGuest');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkGuestMode = async (currentSession: Session | null) => {
        if (!currentSession) {
            const guest = await AsyncStorage.getItem('isGuest');
            setIsGuest(guest === 'true');
        }
        setIsLoading(false);
    };

    const enterGuestMode = async () => {
        await AsyncStorage.setItem('isGuest', 'true');
        setIsGuest(true);
    };

    const logout = async () => {
        if (isGuest) {
            await AsyncStorage.removeItem('isGuest');
            setIsGuest(false);
        } else {
            const { error } = await supabase.auth.signOut();
            if (error) console.error('Error signing out:', error.message);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, isGuest, isLoading, enterGuestMode, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
