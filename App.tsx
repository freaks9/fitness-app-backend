import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { UserProvider } from './src/context/UserContext';

// Screens
import { AuthProvider, useAuth } from './src/context/AuthContext'; // Import AuthContext
import { LanguageProvider } from './src/context/LanguageContext';
import TabNavigator from './src/navigation/TabNavigator';
import AddMealMenuScreen from './src/screens/AddMealMenuScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import CameraScreen from './src/screens/CameraScreen';
import ExerciseEntryScreen from './src/screens/ExerciseEntryScreen';
import LabDetailScreen from './src/screens/LabDetailScreen';
import LabelScannerScreen from './src/screens/LabelScannerScreen';
import MealEntryScreen from './src/screens/MealEntryScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import OnboardingFlow from './src/screens/OnboardingFlow';
import PremiumScreen from './src/screens/PremiumScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { IAPService } from './src/services/IAPService';
import { UsageLimitService } from './src/services/UsageLimitService';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const AppNavigator = () => {
    const { session, isGuest, isLoading } = useAuth();
    const [isOnboardingDone, setIsOnboardingDone] = useState<boolean | null>(null);

    useEffect(() => {
        const checkOnboarding = async () => {
            const status = await AsyncStorage.getItem('onboardingCompleted');
            setIsOnboardingDone(status === 'true');
        };
        checkOnboarding();
    }, []);

    if (isLoading || isOnboardingDone === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style="auto" />
            {session || isGuest ? (
                <Stack.Navigator initialRouteName={isOnboardingDone ? "Main" : "Welcome"}>
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingFlow}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Main"
                        component={TabNavigator}
                        options={{ headerShown: false, gestureEnabled: false, headerBackVisible: false }}
                    />
                    <Stack.Screen
                        name="MealEntry"
                        component={MealEntryScreen}
                        options={{ title: 'Add Meal' }}
                    />
                    <Stack.Screen
                        name="AddMealMenu"
                        component={AddMealMenuScreen}
                        options={{ headerShown: false, presentation: 'modal' }}
                    />
                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: 'Settings & Goals' }}
                    />
                    <Stack.Screen
                        name="ExerciseEntry"
                        component={ExerciseEntryScreen}
                        options={{ title: 'Add Exercise' }}
                    />
                    <Stack.Screen
                        name="Camera"
                        component={CameraScreen}
                        options={{ title: 'Scan Food' }}
                    />
                    <Stack.Screen
                        name="Scanner"
                        component={ScannerScreen}
                        options={{ title: 'Scan Barcode', presentation: 'modal' }}
                    />
                    <Stack.Screen
                        name="LabelScanner"
                        component={LabelScannerScreen}
                        options={{ title: 'Scan Label', presentation: 'modal' }}
                    />
                    <Stack.Screen
                        name="LabDetail"
                        component={LabDetailScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationScreen}
                        options={{ title: '通知' }}
                    />
                    <Stack.Screen
                        name="Premium"
                        component={PremiumScreen}
                        options={{ headerShown: false, presentation: 'fullScreenModal' }}
                    />
                </Stack.Navigator>
            ) : (
                <AuthStack.Navigator initialRouteName="Login">
                    <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <AuthStack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
                </AuthStack.Navigator>
            )}
        </NavigationContainer>
    );
};


export default function App() {
    useEffect(() => {
        const initServices = async () => {
            try {
                // Request ATT permission for iOS
                const { status } = await requestTrackingPermissionsAsync();
                if (status === 'granted') {
                    console.log('ATT permission granted');
                }

                // Initialize mobile ads safely
                await mobileAds().initialize();
                console.log('Mobile Ads initialized');
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
        <SafeAreaProvider>
            <ErrorBoundary>
                <LanguageProvider>
                    <AuthProvider>
                        <UserProvider>
                            <AppNavigator />
                        </UserProvider>
                    </AuthProvider>
                </LanguageProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}
