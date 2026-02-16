import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface CountUpTextProps {
    value: number;
    duration?: number;
    style?: StyleProp<TextStyle>;
    formatter?: (val: number) => string;
}

export const CountUpText: React.FC<CountUpTextProps> = ({
    value,
    duration = 1000,
    style,
    formatter = (val) => Math.round(val).toString(),
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(0);
    const endValueRef = useRef(value);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        // Reset and start animation whenever target value changes
        startValueRef.current = displayValue;
        endValueRef.current = value;
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            const currentVal = startValueRef.current + (endValueRef.current - startValueRef.current) * easedProgress;
            setDisplayValue(currentVal);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [value, duration]);

    return <Text style={style}>{formatter(displayValue)}</Text>;
};
