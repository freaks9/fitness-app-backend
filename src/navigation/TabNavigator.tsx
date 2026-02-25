import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart2, Home, Microscope, User, Utensils } from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Screens
import AnalysisScreen from '../screens/AnalysisScreen';
import CommunityScreen from '../screens/CommunityScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MyMenuScreen from '../screens/MyMenuScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    // iconName is not used

                    if (route.name === 'Home') {
                        return <Home size={size} color={color} />;
                    } else if (route.name === 'Analysis') {
                        return <BarChart2 size={size} color={color} />;
                    } else if (route.name === 'Community') {
                        return <Microscope size={size} color={color} />;
                    } else if (route.name === 'MyMenu') {
                        return <Utensils size={size} color={color} />;
                    } else if (route.name === 'MyPage') {
                        return <User size={size} color={color} />;
                    }
                },
                tabBarActiveTintColor: '#1E88E5',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E2E8F0',
                    height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
                    paddingTop: 10,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'ホーム' }} />
            <Tab.Screen name="Analysis" component={AnalysisScreen} options={{ tabBarLabel: '分析' }} />
            <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarLabel: 'ラボ' }} />
            <Tab.Screen name="MyMenu" component={MyMenuScreen} options={{ tabBarLabel: 'マイメニュー' }} />
            <Tab.Screen name="MyPage" component={MyPageScreen} options={{ tabBarLabel: 'マイページ' }} />
        </Tab.Navigator>
    );
};

export default TabNavigator;
