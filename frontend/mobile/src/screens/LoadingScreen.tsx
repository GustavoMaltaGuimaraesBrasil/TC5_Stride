import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  filename: string;
  stage?: string;
}

export default function LoadingScreen({ filename, stage }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Analyzing...</Text>
      <Text style={styles.filename}>{filename}</Text>
      {stage && <Text style={styles.stage}>{stage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  filename: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 4,
  },
  stage: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
});
