import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  compact,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
  compact?: boolean;
}) {
  const palette =
    variant === 'secondary'
      ? styles.btnSecondary
      : variant === 'ghost'
        ? styles.btnGhost
        : variant === 'danger'
          ? styles.btnDanger
          : styles.btnPrimary;
  const textStyle =
    variant === 'secondary' || variant === 'ghost'
      ? styles.btnTextDark
      : variant === 'danger'
        ? styles.btnTextDanger
        : styles.btnTextLight;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        palette,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.moss : colors.white}
        />
      ) : (
        <Text style={[styles.btnText, compact && styles.btnTextCompact, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.mute}
      style={[styles.input, props.style]}
    />
  );
}

export type ChipTone = 'default' | 'spain' | 'portugal' | 'walk' | 'bike' | 'neutral' | 'accent';

export function Chip({
  label,
  active,
  onPress,
  tone = 'default',
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: ChipTone;
}) {
  const idle = toneStyles[tone].idle;
  const on = toneStyles[tone].on;
  const idleText = toneStyles[tone].idleText;
  const onText = toneStyles[tone].onText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        idle,
        active && on,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, idleText, active && onText]}>{label}</Text>
    </Pressable>
  );
}

export function FilterRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterChips}>{children}</View>
    </View>
  );
}

export function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const toneStyles: Record<
  ChipTone,
  { idle: ViewStyle; on: ViewStyle; idleText: { color: string }; onText: { color: string } }
> = {
  default: {
    idle: { backgroundColor: colors.white, borderColor: colors.line },
    on: { backgroundColor: colors.moss, borderColor: colors.moss },
    idleText: { color: colors.ink },
    onText: { color: colors.white },
  },
  spain: {
    idle: { backgroundColor: '#FFF7F2', borderColor: '#E2B39A' },
    on: { backgroundColor: '#B03A2E', borderColor: '#8E2F25' },
    idleText: { color: '#7A3B2E' },
    onText: { color: '#FFF8F0' },
  },
  portugal: {
    idle: { backgroundColor: '#F2F7F3', borderColor: '#9BB8A3' },
    on: { backgroundColor: '#1F6B45', borderColor: '#165536' },
    idleText: { color: '#1F4D36' },
    onText: { color: '#F4FFF8' },
  },
  walk: {
    idle: { backgroundColor: '#F4F7F1', borderColor: '#B7C7AE' },
    on: { backgroundColor: colors.moss, borderColor: colors.mossDark },
    idleText: { color: colors.mossDark },
    onText: { color: colors.white },
  },
  bike: {
    idle: { backgroundColor: '#FFF6EE', borderColor: '#E2B48E' },
    on: { backgroundColor: colors.clay, borderColor: '#9E481E' },
    idleText: { color: '#8A3F1A' },
    onText: { color: colors.white },
  },
  neutral: {
    idle: { backgroundColor: colors.white, borderColor: colors.line },
    on: { backgroundColor: colors.ink, borderColor: colors.ink },
    idleText: { color: colors.mute },
    onText: { color: colors.sand },
  },
  accent: {
    idle: { backgroundColor: colors.white, borderColor: colors.line },
    on: { backgroundColor: colors.viaCanada, borderColor: '#5E3A1C' },
    idleText: { color: colors.ink },
    onText: { color: colors.sand },
  },
};

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  btnCompact: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  btnPrimary: { backgroundColor: colors.moss },
  btnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.moss,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDanger: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  btnTextCompact: { fontSize: 13 },
  btnTextLight: { color: colors.white },
  btnTextDark: { color: colors.moss },
  btnTextDanger: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    color: colors.ink,
    borderRadius: radii.md,
    fontSize: 16,
  },
  chip: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  chipText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.15 },
  filterRow: { marginBottom: 10 },
  filterTitle: {
    color: colors.mute,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
});
