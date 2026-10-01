import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { AppText } from '../ui';
import { uploadPlannerEvidencePhoto, deletePlannerEvidencePhoto } from '../../services/plannerEvidence';

type EvidencePhotoPickerProps = {
  accessToken: string;
  householdId: string;
  taskId: string;
  requiresVerification: boolean;
  onSubmit: (photoUrl: string, comment?: string) => Promise<void>;
  onCancel?: () => void;
};

export function EvidencePhotoPicker({
  accessToken,
  householdId,
  taskId,
  requiresVerification,
  onSubmit,
  onCancel,
}: EvidencePhotoPickerProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisos', 'Necesitamos acceso a tu galería para seleccionar la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('No pudimos abrir la galería.');
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisos', 'Necesitamos acceso a la cámara para tomar la foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      setError('No pudimos abrir la cámara.');
    }
  }, []);

  const removePhoto = useCallback(() => {
    setPhotoUri(null);
    setComment('');
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!photoUri) {
      setError(requiresVerification ? 'La foto es obligatoria para enviar a revisión.' : 'Seleccioná una foto.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const photoUrl = await uploadPlannerEvidencePhoto(accessToken, householdId, taskId, photoUri);
      await onSubmit(photoUrl, comment.trim() || undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos subir la foto. Probá de nuevo.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = photoUri !== null && !uploading;

  return (
    <View style={styles.container}>
      <AppText variant="caption" weight="800" style={styles.sectionTitle}>Evidencia</AppText>

      {!photoUri ? (
        <View style={styles.pickerArea}>
          <TouchableOpacity style={[styles.pickerBtn, styles.pickerBtnPrimary]} onPress={pickPhoto}>
            <HomePlusIcon name="image" size={28} color={colors.terracotta[600]} />
            <AppText variant="body" weight="700" style={styles.pickerBtnText}>Elegir de galería</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.pickerBtn, styles.pickerBtnSecondary]} onPress={takePhoto}>
            <HomePlusIcon name="camera" size={28} color={colors.terracotta[600]} />
            <AppText variant="body" weight="700" style={styles.pickerBtnText}>Tomar foto</AppText>
          </TouchableOpacity>

          {requiresVerification && (
            <AppText variant="caption" tone="tertiary" style={styles.requiredNote}>
              Requerido para enviar a revisión
            </AppText>
          )}
        </View>
      ) : (
        <View style={styles.previewArea}>
          <View style={styles.previewWrapper}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.removeBtn} onPress={removePhoto} accessibilityLabel="Eliminar foto">
              <HomePlusIcon name="close" size={18} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Comentario opcional"
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={500}
          />

          {error && <AppText variant="caption" tone="danger" style={styles.errorText}>{error}</AppText>}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={removePhoto} disabled={uploading}>
              <AppText variant="body" weight="700" style={styles.actionBtnText}>Cambiar foto</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary, !canSubmit && styles.actionBtnDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <AppText variant="body" weight="700" style={styles.actionBtnText}>
                  {requiresVerification ? 'Enviar a revisión' : 'Adjuntar evidencia'}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <AppText variant="bodySmall" weight="600" tone="secondary">Cancelar</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  pickerArea: {
    gap: spacing[2],
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing[4],
  },
  pickerBtnPrimary: {
    borderColor: colors.terracotta[300],
    backgroundColor: colors.terracotta[50],
  },
  pickerBtnSecondary: {
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  pickerBtnText: {
    color: colors.terracotta[700],
    fontSize: 15,
  },
  requiredNote: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
  previewArea: {
    gap: spacing[3],
  },
  previewWrapper: {
    position: 'relative',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInput: {
    minHeight: 80,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    padding: spacing[3],
    color: colors.text.primary,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: spacing[1],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtnPrimary: {
    backgroundColor: colors.terracotta[500],
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.terracotta[300],
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: colors.text.inverse,
    fontSize: 14,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
  },
});