/**
 * HOMePLUS Assets — S8-07: detach a File from an owner.
 *
 * The copy is frozen and it NEVER implies that the File is deleted:
 *
 *   Title: "Quitar archivo"
 *   Body:  "El archivo va a seguir en HomeCloud. Sólo lo quitamos de este activo."
 *   CTA:   "Quitar"
 *
 * For a Record or a Care the noun of the owner is adapted, and NOTHING else:
 * the meaning is preserved exactly. The HomeCloud File is never deleted,
 * trashed or purged by this action: only the Assets relation is removed.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorBar } from './ErrorBar';
import { AssetConfirmSheet } from './AssetSheet';
import type { AssetFileOwnerType } from '../../services/assets/assetsFiles';

/** The frozen owner nouns. Only the noun changes between the owner kinds. */
const OWNER_NOUN: Record<AssetFileOwnerType, string> = {
  asset: 'este activo',
  record: 'este registro',
  care: 'este registro',
};

/** The frozen body of the unlink confirmation. */
export function assetFileUnlinkCopy(ownerType: AssetFileOwnerType): string {
  return `El archivo va a seguir en HomeCloud. Sólo lo quitamos de ${OWNER_NOUN[ownerType]}.`;
}

export function AssetFileUnlinkSheet({
  visible,
  ownerType,
  pending = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  ownerType: AssetFileOwnerType;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AssetConfirmSheet
      visible={visible}
      title="Quitar archivo"
      consequences={assetFileUnlinkCopy(ownerType)}
      cancelLabel="Cancelar"
      confirmLabel="Quitar"
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

/**
 * The failure surface of the unlink.
 *
 * It is rendered by the caller (the files section), not inside the sheet, so
 * the sheet keeps the frozen copy intact.
 */
export function AssetFileUnlinkError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorWrap}>
      <ErrorBar visible message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    width: '100%',
  },
});
