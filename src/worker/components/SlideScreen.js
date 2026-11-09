import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { useNavigation } from 'expo-router';

// Ekranni mayin surib kiritadi va yopilganda ham mayin chiqarib yuboradi.
// Marshrutda `animation: 'none'` bo'lishi kerak (tizim o'tishi o'chiriladi).
export default function SlideScreen({ children, from = 'right', enter = 650, exit = 450 }) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [anim] = useState(() => new Animated.Value(0));
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: enter,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [anim, enter]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (closing.current) return;
        e.preventDefault();
        closing.current = true;
        Animated.timing(anim, {
          toValue: 0,
          duration: exit,
          easing: Easing.bezier(0.5, 0, 0.75, 0),
          useNativeDriver: true,
        }).start(() => navigation.dispatch(e.data.action));
      }),
    [navigation, anim, exit]
  );

  const dist = from === 'left' ? -width : width;
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [dist, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
