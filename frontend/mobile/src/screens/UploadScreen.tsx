/** Tela de upload para selecionar/fotografar imagens e abrir analises salvas. */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import type { AnalysisListItem } from '../services/api';

interface Props {
  onImageSelected: (uri: string, filename: string, mimeType?: string) => void;
  analyses: AnalysisListItem[];
  historyLoading?: boolean;
  onOpenAnalysis: (id: number) => void;
  onDeleteAnalysis: (id: number) => void;
  onRefreshHistory: () => void;
  disabled?: boolean;
}

/** Executa a funcao buildUploadMeta. */
function buildUploadMeta(
  asset: ImagePicker.ImagePickerAsset,
  fallbackBaseName: string,
): { filename: string; mimeType?: string } {
  const mimeType = asset.mimeType ?? undefined;
  const providedName = asset.fileName?.trim() || fallbackBaseName;
  const hasExt = /\.[a-z0-9]+$/i.test(providedName);

  if (hasExt || !mimeType) {
    return { filename: providedName, mimeType };
  }

  const extByMime: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };

  const ext = extByMime[mimeType];
  return { filename: ext ? `${providedName}${ext}` : providedName, mimeType };
}

/** Executa a funcao UploadScreen. */
export default function UploadScreen({
  onImageSelected,
  analyses,
  historyLoading = false,
  onOpenAnalysis,
  onDeleteAnalysis,
  onRefreshHistory,
  disabled,
}: Props) {
  /** Executa a funcao pickImage. */
  const pickImage = async () => {
    if (disabled) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const { filename, mimeType } = buildUploadMeta(asset, 'diagrama');
      onImageSelected(asset.uri, filename, mimeType);
    }
  };

  /** Executa a funcao takePhoto. */
  const takePhoto = async () => {
    if (disabled) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const { filename, mimeType } = buildUploadMeta(asset, 'foto');
      onImageSelected(asset.uri, filename, mimeType);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.icon}>[STRIDE]</Text>
        <Text style={styles.title}>{'Modelador de Amea\u00e7as STRIDE'}</Text>
        <Text style={styles.subtitle}>
          {'Envie ou fotografe um diagrama de arquitetura para receber uma an\u00e1lise STRIDE automatizada'}
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={pickImage} disabled={disabled}>
        <Text style={styles.primaryBtnText}>Selecionar da Galeria</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto} disabled={disabled}>
        <Text style={styles.secondaryBtnText}>Tirar Foto</Text>
      </TouchableOpacity>

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Processamentos Salvos</Text>
        <TouchableOpacity onPress={onRefreshHistory} disabled={disabled || historyLoading}>
          <Text style={styles.refreshText}>{historyLoading ? 'Atualizando...' : 'Atualizar'}</Text>
        </TouchableOpacity>
      </View>

      {analyses.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum processamento salvo ainda.</Text>
      ) : (
        analyses.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.historyItemTitle}>#{item.id} - {item.image_filename}</Text>
            <Text style={styles.historyItemMeta}>
              {`Status: ${item.status} | Amea\u00e7as: ${item.threat_count}`}
            </Text>
            <View style={styles.historyActions}>
              <TouchableOpacity
                style={styles.historyOpenBtn}
                onPress={() => onOpenAnalysis(item.id)}
                disabled={disabled}
              >
                <Text style={styles.historyOpenText}>Abrir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.historyDeleteBtn}
                onPress={() => onDeleteAnalysis(item.id)}
                disabled={disabled}
              >
                <Text style={styles.historyDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 20,
    marginBottom: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  historyHeader: {
    marginTop: 28,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  refreshText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  historyItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  historyItemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  historyOpenBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  historyOpenText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  historyDeleteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  historyDeleteText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
  },
});
