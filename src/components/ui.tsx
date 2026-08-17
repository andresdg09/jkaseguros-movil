import { Picker } from '@react-native-picker/picker';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/colors';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const Content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {Content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function FormField({
  label,
  required,
  ...inputProps
}: { label: string; required?: boolean } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
    </View>
  );
}

export function FormSelect({
  label,
  required,
  selectedValue,
  onValueChange,
  items,
}: {
  label: string;
  required?: boolean;
  selectedValue: string | number;
  onValueChange: (value: string) => void;
  items: { label: string; value: string | number }[];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={String(selectedValue)}
          onValueChange={(v) => onValueChange(String(v))}
          style={styles.picker}
          dropdownIconColor="#0f172a">
          {items.map((item) => (
            // color explícito: en Android el Picker no hereda un color de texto por
            // defecto legible, y el valor seleccionado terminaba invisible.
            <Picker.Item key={String(item.value)} label={item.label} value={String(item.value)} color="#0f172a" />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export function ChipMultiSelect({
  label,
  required,
  values,
  onToggle,
  items,
  max,
  onMaxReached,
}: {
  label: string;
  required?: boolean;
  values: string[];
  onToggle: (value: string) => void;
  items: { label: string; value: string | number }[];
  max?: number;
  onMaxReached?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={styles.chipRow}>
        {items.map((item) => {
          const value = String(item.value);
          const selected = values.includes(value);
          const atMax = !!max && values.length >= max && !selected;
          return (
            <Pressable
              key={value}
              onPress={() => (atMax ? onMaxReached?.() : onToggle(value))}
              style={[styles.chip, selected && styles.chipSelected, atMax && styles.chipDisabled]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'whatsapp';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Brand.primary : '#fff'} />
      ) : (
        <Text
          style={[styles.buttonText, variant === 'secondary' && { color: Brand.primary }]}
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const variantStyles: Record<ButtonVariant, any> = StyleSheet.create({
  primary: { backgroundColor: Brand.primary },
  accent: { backgroundColor: Brand.accent },
  secondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: Brand.primary },
  danger: { backgroundColor: Brand.danger },
  whatsapp: { backgroundColor: Brand.whatsapp },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primary,
    marginBottom: 12,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: { color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: Brand.accent, backgroundColor: Brand.secondary },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  chipTextSelected: { color: Brand.accent },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
