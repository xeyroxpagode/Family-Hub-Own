import React from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, shadows } from '../../constants/theme';
import { AppButton, AppText } from '../ui';
import { getInviteLinkDebugInfo, normalizeInviteLink } from './inviteLinkUtils';

type InviteLinkSheetProps = {
  visible: boolean;
  onClose: () => void;
  inviteUrl: string | null;
  inviteToken: string | null;
  inviteLink?: unknown;
  hasActiveLink: boolean;
  onCreateInvite: () => Promise<unknown | string | null | void>;
  onRevokeInviteLink?: () => Promise<string | null | void>;
  canRevoke?: boolean;
};

const compactLink = (value: string) => {
  if (value.length <= 42) return value;
  return `${value.slice(0, 24)}...${value.slice(-12)}`;
};

export const InviteLinkSheet: React.FC<InviteLinkSheetProps> = ({
  visible,
  onClose,
  inviteUrl,
  inviteToken,
  inviteLink,
  onCreateInvite,
  onRevokeInviteLink,
  canRevoke = false,
}) => {
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = React.useState(false);
  const [revoking, setRevoking] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = React.useState<unknown | null>(null);

  React.useEffect(() => {
    if (visible) setInlineError(null);
  }, [visible, inviteLink, inviteToken, inviteUrl]);

  React.useEffect(() => {
    if (!visible) setCreatedInviteLink(null);
  }, [visible]);

  if (!visible) return null;

  const propInviteLink = inviteLink ?? (
    inviteToken || inviteUrl
      ? { token: inviteToken ?? undefined, url: inviteUrl ?? undefined }
      : null
  );
  const normalizedInvite = normalizeInviteLink(createdInviteLink ?? propInviteLink);
  const shareableLink = normalizedInvite.displayValue ?? null;
  const qrValue = normalizedInvite.url ?? null;
  const hasRenderableInvite = Boolean(qrValue);
  const qrValueForRender = qrValue ?? '';

  if (__DEV__) {
    console.log('[InviteLinkSheet] normalized invite', getInviteLinkDebugInfo(createdInviteLink ?? propInviteLink));
  }

  const handleCreate = async () => {
    setCreating(true);
    setInlineError(null);

    try {
      const result = await onCreateInvite();
      if (typeof result === 'string' && result.length > 0) {
        setInlineError('No pudimos crear la invitación. Intentá de nuevo.');
      } else if (result && typeof result === 'object') {
        const normalized = normalizeInviteLink(result);
        if (normalized.url) {
          setCreatedInviteLink(result);
        } else {
          setInlineError('La invitación se creó, pero no pudimos mostrar el QR.');
        }
      } else {
        setInlineError('No pudimos crear la invitaciÃ³n. IntentÃ¡ de nuevo.');
      }
    } catch {
      setInlineError('No pudimos crear la invitación. Intentá de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async () => {
    if (!shareableLink) return;

    await Share.share({
      title: 'Invitación HomePlus',
      message: `Te invito a unirte a mi hogar en HomePlus. Abrí este enlace: ${shareableLink}`,
    });
  };

  const handleShowLink = () => {
    if (!shareableLink) return;
    Alert.alert('Link de invitación', shareableLink);
  };

  const handleRevoke = () => {
    setInlineError(null);
    Alert.alert(
      'Revocar invitación',
      '¿Seguro que querés revocar este link de invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              const errorMessage = await onRevokeInviteLink?.();
              if (typeof errorMessage === 'string' && errorMessage.length > 0) {
                setInlineError('No pudimos desactivar el link. Intentá de nuevo.');
              } else {
                setCreatedInviteLink(null);
              }
            } catch {
              setInlineError('No pudimos desactivar el link. Intentá de nuevo.');
            } finally {
              setRevoking(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, hasRenderableInvite ? styles.sheetActive : styles.sheetCompact]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <AppButton variant="icon" size="sm" onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar invitacion"><HomePlusIcon name="close" size={20} color={colors.text.secondary} /></AppButton>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing[5] }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <AppText variant="title3">Invitar al hogar</AppText>
              {hasRenderableInvite ? (
                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <AppText variant="caption" tone="tertiary">Link activo</AppText>
                </View>
              ) : null}
            </View>

            {!hasRenderableInvite ? (
              <View style={styles.emptyState}>
                <AppText variant="body" tone="secondary">
                  Creá un link para sumar personas de confianza.
                </AppText>
                <AppText variant="bodySmall" tone="tertiary">
                  Solo podrán solicitar acceso; vos aprobás el ingreso.
                </AppText>
                {inlineError ? (
                  <AppText variant="bodySmall" tone="danger" style={styles.inlineError}>
                    {inlineError}
                  </AppText>
                ) : null}
                <AppButton
                  title={creating ? 'Creando...' : 'Crear invitación'}
                  variant="primary"
                  size="md"
                  loading={creating}
                  disabled={creating}
                  onPress={handleCreate}
                  leftSlot={<HomePlusIcon name="person-add" size={18} color={colors.text.inverse} />}
                  style={styles.createButton}
                />
              </View>
            ) : (
              <View style={styles.activeContent}>
                <View style={styles.qrArea}>
                  <View style={styles.qrFrame}>
                    <QRCode value={qrValueForRender} size={236} backgroundColor="#FFFFFF" color="#1C1C1C" />
                  </View>
                  <AppText variant="bodySmall" tone="secondary" align="center">
                    Escaneá para solicitar acceso al hogar.
                  </AppText>
                  <AppText variant="caption" tone="tertiary" align="center">
                    No compartas este código en lugares abiertos.
                  </AppText>
                </View>

                {shareableLink ? (
                  <View style={styles.linkBlock}>
                    <AppText variant="caption" tone="tertiary" weight="700">Link</AppText>
                    <AppText variant="caption" tone="secondary" selectable numberOfLines={2}>
                      {compactLink(shareableLink)}
                    </AppText>
                  </View>
                ) : null}

                {inlineError ? (
                  <AppText variant="bodySmall" tone="danger" style={styles.inlineError}>
                    {inlineError}
                  </AppText>
                ) : null}

                <View style={styles.actions}>
                  <AppButton
                    title="Compartir"
                    variant="primary"
                    size="md"
                    onPress={handleShare}
                    leftSlot={<HomePlusIcon name="share-social" size={18} color={colors.text.inverse} />}
                    style={styles.actionButton}
                  />
                  <AppButton title="Ver link" variant="secondary" size="md" onPress={handleShowLink} style={styles.actionButton} />
                </View>

                {canRevoke && onRevokeInviteLink ? (
                  <View style={styles.revokeSection}>
                    <AppButton
                      title="Revocar link"
                      variant="ghost"
                      size="sm"
                      loading={revoking}
                      disabled={revoking}
                      onPress={handleRevoke}
                      textStyle={styles.revokeText}
                    />
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.surface.overlayStrong,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.sheet,
  },
  sheetCompact: {
    maxHeight: '46%',
  },
  sheetActive: {
    maxHeight: '92%',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[4],
    paddingHorizontal: spacing[5],
    position: 'relative',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
  },
  closeButton: {
    position: 'absolute',
    right: spacing[4],
    top: spacing[2],
  },
  content: {
    maxHeight: '100%',
  },
  contentContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  header: {
    gap: spacing[2],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.success.base,
  },
  emptyState: {
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  createButton: {
    marginTop: spacing[1],
  },
  activeContent: {
    gap: spacing[4],
  },
  qrArea: {
    alignItems: 'center',
    gap: spacing[3],
  },
  qrFrame: {
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.elevated,
  },
  linkBlock: {
    gap: spacing[1],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
  },
  inlineError: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.danger.soft,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    flex: 1,
  },
  revokeSection: {
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    alignItems: 'flex-start',
  },
  revokeText: {
    color: colors.danger.text,
  },
});
