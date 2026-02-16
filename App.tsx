import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Screens
import { AuthProvider, useAuth } from './src/context/AuthContext'; // Import AuthContext
import { LanguageProvider } from './src/context/LanguageContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import CameraScreen from './src/screens/CameraScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ExerciseEntryScreen from './src/screens/ExerciseEntryScreen';
import LabelScannerScreen from './src/screens/LabelScannerScreen';
import MealEntryScreen from './src/screens/MealEntryScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const AppNavigator = () => {
    const { session, isGuest, isLoading } = useAuth();
    const [initialRoute, setInitialRoute] = useState('Onboarding'); // Keep specific onboarding logic if needed

    // Check Onboarding status locally or via DB if logged in
    // For now, let's assume if logged in OR guest, we show main app
    // We can show Onboarding inside the main stack if needed.

    if (isLoading) {
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
                <Stack.Navigator initialRouteName="Dashboard">
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ title: 'Fitness Tracker', gestureEnabled: false, headerBackVisible: false }}
                    />
                    <Stack.Screen
                        name="MealEntry"
                        component={MealEntryScreen}
                        options={{ title: 'Add Meal' }}
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
                        name="Onboarding"
                        component={OnboardingScreen}
                        options={{ headerShown: false }}
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
    return (
        <LanguageProvider>
            <AuthProvider>
                <AppNavigator />
            </AuthProvider>
        </LanguageProvider>
    );
}
