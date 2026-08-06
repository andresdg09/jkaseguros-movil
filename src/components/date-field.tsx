import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Brand } from '@/constants/colors';

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return { day: '', month: '', year: '' };
  return { year: match[1], month: match[2], day: match[3] };
}

export function DateField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const initial = parseIso(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    const parsed = parseIso(value);
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.small]}
          placeholder="DD"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={2}
          value={day}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '');
            setDay(clean);
            emit(clean, month, year);
          }}
        />
        <Text style={styles.sep}>/</Text>
        <TextInput
          style={[styles.input, styles.small]}
          placeholder="MM"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={2}
          value={month}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '');
            setMonth(clean);
            emit(day, clean, year);
          }}
        />
        <Text style={styles.sep}>/</Text>
        <TextInput
          style={[styles.input, styles.large]}
          placeholder="AAAA"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={4}
          value={year}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '');
            setYear(clean);
            emit(day, month, clean);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  small: { width: 56 },
  large: { width: 84 },
  sep: { fontSize: 16, color: Brand.textMuted },
});
