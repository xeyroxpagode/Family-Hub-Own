import React from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {HomePlusIcon} from '../../constants/icons';
import {colors,radius} from '../../constants/theme';
import {INVENTORY_LOCATION_ICONS} from '../../services/inventoryV2Presentation';
import {AppInput,AppText} from '../ui';

/**
 * THE single authority of the Inventory location form.
 *
 * `Create Location` inside the ProductFlow and `Create/Edit Location` inside
 * the Locations Manager render THIS component. There is no second form, no
 * second validation and no second icon selector: the two contexts differ only
 * in where the form is mounted (an internal page of the flow sheet, or the
 * body of a standard sheet).
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md`
 * §14.11.3, §14.12.
 */

/** Maximum length of a location name. */
export const INVENTORY_LOCATION_NAME_MAX_LENGTH=60;

/** The icon used when nothing was chosen. */
export const INVENTORY_LOCATION_DEFAULT_ICON='cube-outline';

/** The draft a location form edits. */
export type InventoryLocationDraft = { name: string; icon: string };

export const emptyInventoryLocationDraft = (): InventoryLocationDraft => ({
  name: '',
  icon: INVENTORY_LOCATION_DEFAULT_ICON,
});

/** Validate a location name. Returns the error text, or `null` when it is valid. */
export function validateInventoryLocationName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Ingresá un nombre.';
  if (trimmed.length > INVENTORY_LOCATION_NAME_MAX_LENGTH) {
    return `Máximo ${INVENTORY_LOCATION_NAME_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/** Is the draft different from the persisted location? */
export function isInventoryLocationDraftDirty(
  draft: InventoryLocationDraft,
  base: InventoryLocationDraft,
): boolean {
  return draft.name.trim() !== base.name.trim() || draft.icon !== base.icon;
}

/**
 * The location form body.
 *
 * It owns NO sheet and NO modal: the icon picker is a separate internal page
 * that the host renders, so the form never opens a sheet over a sheet.
 */
export function InventoryLocationForm({draft,onChange,onPickIcon,errorText,disabled=false}:{
  draft: InventoryLocationDraft;
  onChange: (next: InventoryLocationDraft) => void;
  onPickIcon: () => void;
  errorText?: string;
  disabled?: boolean;
}){
  const iconLabel=INVENTORY_LOCATION_ICONS.find(option=>option.icon===draft.icon)?.label??'Otro';
  return <View style={styles.form}>
    <AppInput label="Nombre" value={draft.name} onChangeText={name=>onChange({...draft,name})} maxLength={INVENTORY_LOCATION_NAME_MAX_LENGTH} editable={!disabled} errorText={errorText}/>
    <Pressable style={styles.row} onPress={disabled?undefined:onPickIcon} accessibilityRole="button" accessibilityLabel={`Elegir icono, ${iconLabel}`}>
      <HomePlusIcon name={draft.icon as any} size={24} color={colors.brand}/>
      <View style={{flex:1}}>
        <AppText variant="caption" tone="secondary">Icono</AppText>
        <AppText>{iconLabel}</AppText>
      </View>
      <HomePlusIcon name="chevron-forward" size={20} color={colors.text.tertiary}/>
    </Pressable>
  </View>;
}

/**
 * The canonical icon grid.
 *
 * It is a PAGE, not a modal: the host renders it inside the same surface that
 * hosts the form, so there is never a modal over a modal.
 */
export function InventoryLocationIconGrid({icon,onSelect}:{icon:string;onSelect:(icon:string)=>void}){
  return <View style={styles.grid}>
    {INVENTORY_LOCATION_ICONS.map(option=>(
      <Pressable
        key={option.icon}
        style={[styles.choice,icon===option.icon&&styles.choiceSelected]}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        accessibilityState={{selected:icon===option.icon}}
        onPress={()=>onSelect(option.icon)}
      >
        <HomePlusIcon name={option.icon} size={25} color={colors.brand}/>
        <AppText variant="micro" align="center">{option.label}</AppText>
      </Pressable>
    ))}
  </View>;
}

const styles=StyleSheet.create({form:{gap:16},row:{minHeight:56,borderWidth:1,borderColor:colors.border.default,borderRadius:radius.md,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:12},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{width:'23%',minHeight:82,borderWidth:1,borderColor:colors.border.default,borderRadius:radius.md,alignItems:'center',justifyContent:'center',gap:6,padding:6},choiceSelected:{borderColor:colors.brand,backgroundColor:colors.brandSoft}});
