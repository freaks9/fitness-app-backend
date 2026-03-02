console.log('App.tsx: Loading imports...');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import { IAPService } from './src/services/IAPService';
import { UsageLimitService } from './src/services/UsageLimitService';

// Screen imports
import TabNavigator from './src/navigation/TabNavigator';
import AddMealMenuScreen from './src/screens/AddMealMenuScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import CameraScreen from './src/screens/CameraScreen';
import ExerciseEntryScreen from './src/screens/ExerciseEntryScreen';
import LabDetailScreen from './src/screens/LabDetailScreen';
import LabelScannerScreen from './src/screens/LabelScannerScreen';
import MealEntryScreen from './src/screens/MealEntryScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
    /* ignore error */
});


const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const AppNavigator = () => {
    const { session, isGuest, isLoading } = useAuth();
    const [isOnboardingDone, setIsOnboardingDone] = useState<boolean | null>(null);
    console.log('AppNavigator: Render - isLoading=', isLoading, 'isOnboardingDone=', isOnboardingDone);

    useEffect(() => {
        const checkOnboarding = async () => {
            const status = await AsyncStorage.getItem('onboardingCompleted');
            setIsOnboardingDone(status === 'true');
        };
        checkOnboarding();

        // Listen for onboarding completion event from OnboardingScreen
        const sub = DeviceEventEmitter.addListener('onboardingComplete', () => {
            setIsOnboardingDone(true);
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        console.log('AppNavigator: isLoading=', isLoading, 'isOnboardingDone=', isOnboardingDone);

        // Safety: Hide splash screen after 10s no matter what
        const emergencyTimer = setTimeout(() => {
            console.log('AppNavigator: Emergency splash hide triggered');
            SplashScreen.hideAsync().catch(() => { });
        }, 10000);

        if (!isLoading && isOnboardingDone !== null) {
            console.log('App is ready, hiding splash screen');
            clearTimeout(emergencyTimer);
            SplashScreen.hideAsync().catch(err => { console.warn('hideAsync error:', err); });
        }

        return () => clearTimeout(emergencyTimer);
    }, [isLoading, isOnboardingDone]);

    // Still loading auth state or onboarding check
    if (isLoading || isOnboardingDone === null) {
        return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
    }

    // First launch: show onboarding
    if (!isOnboardingDone) {
        return (
            <NavigationContainer>
                <StatusBar style="auto" />
                <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
                    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
                </AuthStack.Navigator>
            </NavigationContainer>
        );
    }

    // Not logged in (no session, not guest)
    if (!session && !isGuest) {
        return (
            <NavigationContainer>
                <StatusBar style="auto" />
                <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
                    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
                </AuthStack.Navigator>
            </NavigationContainer>
        );
    }

    // Logged in (session or guest) - show main app
    return (
        <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={TabNavigator} />
                <Stack.Screen name="AddMealMenu" component={AddMealMenuScreen} />
                <Stack.Screen name="MealEntry" component={MealEntryScreen} />
                <Stack.Screen name="Scanner" component={ScannerScreen} />
                <Stack.Screen name="LabelScanner" component={LabelScannerScreen} />
                <Stack.Screen name="Camera" component={CameraScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="Premium" component={PremiumScreen} />
                <Stack.Screen name="Analysis" component={AnalysisScreen} />
                <Stack.Screen name="ExerciseEntry" component={ExerciseEntryScreen} />
                <Stack.Screen name="Notifications" component={NotificationScreen} />
                <Stack.Screen name="LabDetail" component={LabDetailScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};


export default function App() {
    console.log('App: Component rendering...');
    useEffect(() => {
        const initServices = async () => {
            try {
                // Request ATT permission for iOS
                const { status } = await requestTrackingPermissionsAsync();
                if (status === 'granted') {
                    console.log('ATT permission granted');
                }

                // Initialize mobile ads safely with a timeout
                console.log('App: Initializing Mobile Ads...');
                const adInitPromise = mobileAds().initialize();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('AdMob Init Timeout')), 3000)
                );

                await Promise.race([adInitPromise, timeoutPromise]);
                console.log('App: Mobile Ads initialized');
            } catch (adErr) {
                console.warn('Ad initialization failed but continuing:', adErr);
            }

            try {
                // Initialize IAP and usage limits
                await IAPService.init();
                await UsageLimitService.init();
                console.log('IAP and Usage Services initialized');
            } catch (svcErr) {
                console.warn('Services initialization failed:', svcErr);
            }
        };

        initServices();
    }, []);

    return (
        <SafeAreaProvider style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <ErrorBoundary>
                    <LanguageProvider>
                        <AuthProvider>
                            <UserProvider>
                                <AppNavigator />
                            </UserProvider>
                        </AuthProvider>
                    </LanguageProvider>
                </ErrorBoundary>
            </View>
        </SafeAreaProvider>
    );
}
