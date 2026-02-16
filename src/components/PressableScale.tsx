import React from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

interface PressableScaleProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    activeScale?: number;
    activeOpacity?: number;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
    children,
    style,
    activeScale = 0.96,
    activeOpacity = 0.8,
    ...props
}) => {
    const animation = React.useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.spring(animation, {
            toValue: 1,
            useNativeDriver: true,
            speed: 200,
            bounciness: 0,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(animation, {
            toValue: 0,
            useNativeDriver: true,
            speed: 200,
            bounciness: 0,
        }).start();
    };

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, activeScale],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, activeOpacity],
    });

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            {...props}
        >
            <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};
