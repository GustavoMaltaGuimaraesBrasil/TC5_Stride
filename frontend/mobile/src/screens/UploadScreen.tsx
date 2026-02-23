import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

interface Props {
  onImageSelected: (uri: string, filename: string, mimeType?: string) => void;
  disabled?: boolean;
}

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

export default function UploadScreen({ onImageSelected, disabled }: Props) {
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
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.icon}>[STRIDE]</Text>
        <Text style={styles.title}>Modelador de Ameacas STRIDE</Text>
        <Text style={styles.subtitle}>
          Envie ou fotografe um diagrama de arquitetura para receber uma analise STRIDE automatizada
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={pickImage} disabled={disabled}>
        <Text style={styles.primaryBtnText}>Selecionar da Galeria</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto} disabled={disabled}>
        <Text style={styles.secondaryBtnText}>Tirar Foto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
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
});
