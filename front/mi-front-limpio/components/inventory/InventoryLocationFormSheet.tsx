import React,{useEffect,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import {useInventoryV2} from '../../context/InventoryV2Context';
import {createInventoryLocation,updateInventoryLocation,type InventoryLocation} from '../../services/inventoryV2';
import {BottomSheet,AppButton,AppText} from '../ui';
import {
  INVENTORY_LOCATION_DEFAULT_ICON,
  InventoryLocationForm,
  InventoryLocationIconGrid,
  emptyInventoryLocationDraft,
  isInventoryLocationDraftDirty,
  validateInventoryLocationName,
  type InventoryLocationDraft,
} from './InventoryLocationForm';

const identity=()=>{const value=`inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;return{mutationId:value,idempotencyKey:value};};

/**
 * The standalone Create/Edit Location sheet.
 *
 * It is the SAME form authority the ProductFlow uses (see
 * `InventoryLocationForm`), mounted on the shared `BottomSheet` primitive:
 * one backdrop, one host, one detent state, a dirty guard and a commit lock.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md`
 * §14.11.3, §14.12.
 */
export function InventoryLocationFormSheet({visible,location,onClose,onSaved}:{visible:boolean;location:InventoryLocation|null;onClose:()=>void;onSaved:(location:InventoryLocation)=>void}){
  const {accessToken,state}=useInventoryV2();
  const [draft,setDraft]=useState<InventoryLocationDraft>(emptyInventoryLocationDraft());
  const [base,setBase]=useState<InventoryLocationDraft>(emptyInventoryLocationDraft());
  const [page,setPage]=useState<'form'|'icons'|'discard'>('form');
  const [saving,setSaving]=useState(false);
  const online=state.networkStatus==='online';
  const dirty=isInventoryLocationDraftDirty(draft,base);
  const error=validateInventoryLocationName(draft.name);

  useEffect(()=>{
    if(!visible)return;
    const next:InventoryLocationDraft={name:location?.name??'',icon:location?.icon_key??INVENTORY_LOCATION_DEFAULT_ICON};
    setDraft(next);setBase(next);setPage('form');
  },[visible,location?.id,location?.name,location?.icon_key]);

  const close=()=>{if(dirty&&page!=='discard'){setPage('discard');return;}onClose();};

  const save=async()=>{
    if(!accessToken||error||!draft.name.trim()||!online)return;
    setSaving(true);
    try{
      const response=location
        ?await updateInventoryLocation(accessToken,location.id,{name:draft.name.trim(),icon_key:draft.icon},identity())
        :await createInventoryLocation(accessToken,{name:draft.name.trim(),icon_key:draft.icon},identity());
      setBase({name:draft.name.trim(),icon:draft.icon});
      onSaved(response.location);
      onClose();
    }finally{setSaving(false);}
  };

  const title=page==='discard'?'¿Descartar cambios?':page==='icons'?'Elegir icono':location?'Editar lugar':'Nuevo lugar';

  return <BottomSheet
    visible={visible}
    title={title}
    variant="standard"
    onRequestClose={close}
    dirty={dirty&&page==='form'}
    onRequestDismissGuard={()=>setPage('discard')}
    committing={saving}
    footer={page==='form'?<AppButton title={location?'Guardar':'Crear lugar'} onPress={save} loading={saving} disabled={!draft.name.trim()||!online||Boolean(error)}/>:undefined}
  >
    {page==='discard'?(
      <View style={styles.stack}>
        <AppText tone="secondary">Los cambios de este lugar no se guardaron.</AppText>
        <AppButton title="Seguir editando" onPress={()=>setPage('form')}/>
        <AppButton title="Descartar" variant="danger" onPress={onClose}/>
      </View>
    ):page==='icons'?(
      <InventoryLocationIconGrid icon={draft.icon} onSelect={icon=>{setDraft(current=>({...current,icon}));setPage('form');}}/>
    ):(
      <InventoryLocationForm
        draft={draft}
        onChange={setDraft}
        onPickIcon={()=>setPage('icons')}
        errorText={draft.name.trim()&&error?error:undefined}
        disabled={!online}
      />
    )}
    {!online&&page==='form'?<AppText variant="caption" tone="secondary">Necesitás conexión para guardar.</AppText>:null}
  </BottomSheet>;
}
const styles=StyleSheet.create({stack:{gap:12}});
