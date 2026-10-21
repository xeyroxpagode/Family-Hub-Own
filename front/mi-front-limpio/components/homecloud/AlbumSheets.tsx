import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../constants/theme';
import { ALBUM_DELETE_MEMORIES_SURVIVE_COPY } from '../../services/homecloud/homecloudAlbumScope';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { ActionSheet, AdaptiveActionMenu, AppButton, AppInput, AppText, type MenuAnchor } from '../ui';

/**
 * HomeCloud MO-A2 — Album name editor and Album actions.
 *
 * ONE editor, two modes (`create` | `rename`), built on the existing ActionSheet
 * + AppInput grammar. It has exactly ONE field — the name — because an Album has
 * no cover picker, no description, no tags and no date: those do not exist in
 * the contract and are not invented here.
 *
 * Validation is intentionally minimal and CLIENT-side only for the blank case:
 * duplicate names are ALLOWED (the server permits them and no precheck is
 * implemented), and the server stays the final validator for everything else.
 *
 * The delete sheet carries MANDATORY copy: deleting an Album removes the
 * grouping and its memberships and nothing else, and the user must be told the
 * Memories survive before the mutation runs.
 */

export type AlbumEditorMode = 'create' | 'rename';

export function AlbumNameSheet({
  visible,
  mode,
  initialName,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: AlbumEditorMode;
  initialName: string;
  saving: boolean;
  /** Inline network / backend error. The sheet STAYS open while it is set. */
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);

  // The sheet is the owner of its draft: it re-seeds when it opens and never
  // leaks the previous Album's name into the next edit.
  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setTouched(false);
  }, [initialName, mode, visible]);

  // Whitespace-only is blank. The server is still the final validator.
  const blank = name.trim().length === 0;

  return (
    <ActionSheet
      visible={visible}
      title={mode === 'rename' ? 'Renombrar álbum' : 'Nuevo álbum'}
      onRequestClose={onClose}
      closeDisabled={saving}
      size="content"
      keyboardAware
      footer={
        <AppButton
          title={saving ? 'Guardando…' : 'Guardar'}
          loading={saving}
          disabled={blank || saving}
          onPress={() => { setTouched(true); if (!blank) onSubmit(name.trim()); }}
        />
      }
    >
      <View style={styles.body}>
        <AppInput
          label="Nombre"
          value={name}
          onChangeText={(text) => { setName(text); setTouched(false); }}
          editable={!saving}
          autoFocus
          placeholder="Por ejemplo: Vacaciones 2024"
          returnKeyType="done"
          blurOnSubmit
          errorText={touched && blank ? 'Escribí un nombre para el álbum.' : undefined}
        />
        {error !== null ? (
          <AppText variant="bodySmall" tone="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    </ActionSheet>
  );
}

export function AlbumActionsSheet({
  album,
  anchor,
  canOrganize,
  deleting,
  error,
  onClose,
  onRename,
  onAddMemories,
  onDelete,
}: {
  album: HomeCloudAlbum | null;
  anchor: MenuAnchor | null;
  canOrganize: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onRename: () => void;
  /**
   * MO-A3 entry A: the `...` route into the Selection Surface. It REPLACED the
   * retired AlbumMemoryPicker modal, and it opens exactly the same flow as the
   * empty-Album CTA.
   */
  onAddMemories: () => void;
  onDelete: () => void;
}) {
  return (
    <AdaptiveActionMenu
      visible={album !== null}
      title={album?.name ?? 'Álbum'}
      anchor={anchor}
      itemCount={3}
      onRequestClose={onClose}
      closeDisabled={deleting}
    >
      <View style={styles.body}>
        {/* Nothing here is rendered for a member without organize: no
            render-disabled unusable mutation is offered. */}
        {canOrganize ? (
          <>
            <AppButton
              title="Agregar recuerdos"
              variant="secondary"
              disabled={deleting}
              onPress={onAddMemories}
              accessibilityLabel="Agregar recuerdos existentes a este álbum"
            />
            <AppButton title="Renombrar" variant="secondary" disabled={deleting} onPress={onRename} />
            <AppButton
              title={deleting ? 'Eliminando…' : 'Eliminar álbum'}
              variant="danger"
              loading={deleting}
              disabled={deleting}
              onPress={onDelete}
            />
          </>
        ) : null}
        {/* Mandatory contract copy: the Memories survive. */}
        <AppText variant="caption" tone="secondary">
          {ALBUM_DELETE_MEMORIES_SURVIVE_COPY}
        </AppText>
        {error !== null ? (
          <AppText variant="bodySmall" tone="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    </AdaptiveActionMenu>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing[3], paddingBottom: spacing[2] },
});
