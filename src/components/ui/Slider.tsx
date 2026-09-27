import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import {
  Colors,
  BorderRadius,
  Spacing,
  Typography,
} from "../../constants/theme";

export interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
}

export const EffortSlider: React.FC<SliderProps> = ({
  value = 5,
  min = 1,
  max = 10,
  step = 1,
  onValueChange,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [, setTrackWidth] = useState(0);

  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef<number>(0);
  const trackPageXRef = useRef<number>(0);

  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    minRef.current = min;
    maxRef.current = max;
    stepRef.current = step;
    onValueChangeRef.current = onValueChange;
  });

  const measureTrack = useCallback(
    (callback?: (pageX: number, width: number) => void) => {
      if (!trackRef.current) return;
      const node = trackRef.current as any;

      // Web support
      if (typeof node.getBoundingClientRect === "function") {
        const rect = node.getBoundingClientRect();
        if (rect && rect.width > 0) {
          trackWidthRef.current = rect.width;
          trackPageXRef.current = rect.left;
          setTrackWidth(rect.width);
          callback?.(rect.left, rect.width);
          return;
        }
      }

      // React Native Native support
      if (typeof node.measure === "function") {
        node.measure(
          (
            _x: number,
            _y: number,
            width: number,
            _height: number,
            pageX: number,
            _pageY: number,
          ) => {
            if (width > 0) {
              trackWidthRef.current = width;
              setTrackWidth(width);
            }
            if (pageX !== undefined && !isNaN(pageX)) {
              trackPageXRef.current = pageX;
            }
            callback?.(pageX, width);
          },
        );
      }
    },
    [],
  );

  const calculateValueFromPageX = useCallback(
    (pageX: number, pageLeft?: number, width?: number) => {
      const totalWidth = width ?? trackWidthRef.current;
      const left = pageLeft ?? trackPageXRef.current;

      if (totalWidth <= 0) return;

      const relativeX = pageX - left;
      const clampedX = Math.max(0, Math.min(relativeX, totalWidth));
      const ratio = clampedX / totalWidth;

      const minVal = minRef.current;
      const maxVal = maxRef.current;
      const stepVal = stepRef.current;

      const rawValue = minVal + ratio * (maxVal - minVal);
      const steppedValue =
        Math.round((rawValue - minVal) / stepVal) * stepVal + minVal;
      const clampedValue = Math.max(minVal, Math.min(maxVal, steppedValue));

      setCurrentValue(clampedValue);
      if (onValueChangeRef.current) {
        onValueChangeRef.current(clampedValue);
      }
    },
    [],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          measureTrack((pageX, width) => {
            calculateValueFromPageX(evt.nativeEvent.pageX, pageX, width);
          });
          calculateValueFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (
          evt: GestureResponderEvent,
          _gestureState: PanResponderGestureState,
        ) => {
          calculateValueFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: (evt: GestureResponderEvent) => {
          calculateValueFromPageX(evt.nativeEvent.pageX);
        },
      }),
    [calculateValueFromPageX, measureTrack],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTrackWidth(width);
    trackWidthRef.current = width;
    measureTrack();
  };

  const progressPercent =
    max > min
      ? Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100))
      : 0;

  const getEffortInfo = (val: number) => {
    if (val <= 3) {
      return {
        label: "Facile",
        textColor: Colors.zone2,
        bgColor: Colors.successLight,
      };
    }
    if (val <= 6) {
      return {
        label: "Modéré",
        textColor: "#D97706",
        bgColor: "#FEF3C7",
      };
    }
    if (val <= 8) {
      return {
        label: "Intense",
        textColor: Colors.primary,
        bgColor: Colors.primaryPill,
      };
    }
    return {
      label: "Maximal",
      textColor: Colors.zone5,
      bgColor: "#FEE2E2",
    };
  };

  const effortInfo = getEffortInfo(currentValue);

  return (
    <View style={styles.container}>
      {/* Top Value Display */}
      <View style={styles.headerRow}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreBold}>{currentValue}</Text>
          <Text style={styles.scoreMax}> / {max}</Text>
        </View>
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: effortInfo.bgColor },
          ]}
        >
          <Text style={[styles.badgeText, { color: effortInfo.textColor }]}>
            {effortInfo.label}
          </Text>
        </View>
      </View>

      {/* Slider Track */}
      <View
        ref={trackRef}
        style={styles.trackContainer}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} pointerEvents="none" />
        <View
          style={[styles.trackActive, { width: `${progressPercent}%` }]}
          pointerEvents="none"
        />
        <View
          style={[styles.thumb, { left: `${progressPercent}%` }]}
          pointerEvents="none"
        >
          <View style={styles.thumbInner} />
        </View>
      </View>

      {/* Track Footnotes */}
      <View style={styles.labelsRow}>
        <Text style={styles.subText}>1 • Très facile</Text>
        <Text style={styles.subText}>10 • À fond</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  scoreBold: {
    fontSize: 40,
    fontWeight: "800",
    color: Colors.primary,
    lineHeight: 44,
  },
  scoreMax: {
    fontSize: Typography.sizes.xl,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  badgeContainer: {
    backgroundColor: Colors.primaryPill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: Typography.sizes.sm,
  },
  trackContainer: {
    height: 40,
    justifyContent: "center",
    position: "relative",
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    width: "100%",
  },
  trackActive: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.card,
    marginLeft: -13,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  subText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
