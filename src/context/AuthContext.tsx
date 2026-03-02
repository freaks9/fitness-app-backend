import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
        // Safety timeout: ensure loading ends eventually (5s)
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            checkGuestMode(currentSession).finally(() => {
                clearTimeout(timeout);
                setIsLoading(false);
            });
        }).catch(err => {
            console.error('getSession error:', err);
            setIsLoading(false);
            clearTimeout(timeout);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            if (currentSession) {
                setIsGuest(false);
                AsyncStorage.removeItem('isGuest');
            }
        });

        // Guest mode persistence check
        AsyncStorage.getItem('isGuest').then(isGuestFlag => {
            if (isGuestFlag === 'true') {
                supabase.auth.getSession().then(({ data: { session: guestSession } }) => {
                    if (!guestSession) {
                        supabase.auth.signInAnonymously().then(({ data: { session: newSession } }) => {
                            if (newSession) {
                                setSession(newSession);
                                setUser(newSession.user);
                                setIsGuest(true);
                            }
                        });
                    }
                });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkGuestMode = async (currentSession: Session | null) => {
        if (!currentSession) {
            const guest = await AsyncStorage.getItem('isGuest');
            setIsGuest(guest === 'true');
        }
    };

    const enterGuestMode = async () => {
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            await AsyncStorage.setItem('isGuest', 'true');
            setIsGuest(true);
            setSession(data.session);
            setUser(data.session?.user ?? null);
        } catch (error: any) {
            console.error('Error entering guest mode:', error.message);
            // Fallback to local flag if sign-in fails
            await AsyncStorage.setItem('isGuest', 'true');
            setIsGuest(true);
        }
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
