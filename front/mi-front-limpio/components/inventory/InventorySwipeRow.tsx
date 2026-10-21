import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Pressable,StyleSheet,View,type GestureResponderEvent} from 'react-native';
import {AppText} from '../ui';
import {HomePlusIcon} from '../../constants/icons';
import {colors} from '../../constants/theme';
import {MOTION_CURVES,PREMIUM_MOTION,resolveMotionDuration} from '../../constants/motionSystem';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {hapticIntent} from '../../utils/haptics';

/**
 * The Inventory swipe row.
 *
 * ```
 * swipe left  ->  [ Lista ] [ Mas ]
 * ```
 *
 * Two actions maximum, and NEVER a destructive full swipe: archiving and
 * trashing stay behind the explicit context menu.
 *
 * Contract:
 * - the row follows the finger 1:1 while it is held;
 * - a single haptic is emitted when the open threshold is crossed (with
 *   hysteresis: it is not repeated around the same threshold);
 * - the settle uses the shared motion tokens;
 * - only ONE row is open at a time: opening another closes the previous one;
 * - the vertical scroll of the list is NEVER stolen: the row only claims a
 *   gesture whose horizontal intent is unambiguous.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §14.9,
 * §14.18, §14.19.
 */

/**
 * The registry of the open swipe row lives OUTSIDE the component, in a plain
 * object, and is only ever mutated through module-scope functions: the
 * component never reassigns a variable it does not own.
 */
type InventorySwipeRegistry = {
  /** The closer of the row that is currently open, if any. */
  openCloser: null | (() => void);
  /** Timestamp of the last swipe interaction (ms). */
  interactionAt: number;
};

const swipeRegistry: InventorySwipeRegistry = { openCloser: null, interactionAt: 0 };

const registerOpenCloser = (next: null | (() => void)) => {
  swipeRegistry.openCloser = next;
};

const markSwipeInteraction = () => {
  swipeRegistry.interactionAt = Date.now();
};

export const closeOpenInventorySwipe = () => {
  swipeRegistry.openCloser?.();
  swipeRegistry.openCloser = null;
};

/**
 * Timestamp of the last swipe interaction.
 *
 * On web (RNW) the mouse-up of a drag also fires the click of the row: the
 * consumers use this mark to tell a real press from the collateral click of a
 * swipe.
 */
export const inventorySwipeInteractionAt = () => swipeRegistry.interactionAt;

/** Width of the primary action ("Lista"). */
export const INVENTORY_SWIPE_PRIMARY_WIDTH=76;
/** Width of the secondary action ("Más"). */
export const INVENTORY_SWIPE_SECONDARY_WIDTH=68;
/** Total width revealed when the row is open. */
export const INVENTORY_SWIPE_OPEN_WIDTH=INVENTORY_SWIPE_PRIMARY_WIDTH+INVENTORY_SWIPE_SECONDARY_WIDTH;

const TRIGGER_DISTANCE=12;
const INTENT_RATIO=1.2;
const OPEN_THRESHOLD=INVENTORY_SWIPE_OPEN_WIDTH*0.5;
const FLICK_VELOCITY=0.35;

export function InventorySwipeRow({children,onPrimary,onMore,primaryLabel='Lista',secondaryLabel='Más',primaryDone=false,disabled=false,closeSignal}:{children:React.ReactNode;onPrimary?:()=>void;onMore:(event:GestureResponderEvent)=>void;primaryLabel?:string;secondaryLabel?:string;primaryDone?:boolean;disabled?:boolean;closeSignal?:unknown}){
  const reducedMotion=useReducedMotion();
  const translate=useRef(new Animated.Value(0)).current;const current=useRef(0);
  const thresholdArmed=useRef(true);
  const [open,setOpen]=useState(false);
  const openRef=useRef(open);openRef.current=open;
  const settle=useCallback((toValue:number)=>{
    Animated.timing(translate,{toValue,duration:resolveMotionDuration(reducedMotion,PREMIUM_MOTION.state),easing:MOTION_CURVES.standardOut,useNativeDriver:true}).start(()=>{current.current=toValue;});
  },[reducedMotion,translate]);
  const close=useCallback(()=>{
    thresholdArmed.current=true;settle(0);setOpen(false);
    if(swipeRegistry.openCloser===close)registerOpenCloser(null);
  },[settle]);
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{closeRef.current();},[closeSignal]);
  useEffect(()=>()=>{if(swipeRegistry.openCloser===closeRef.current)registerOpenCloser(null);},[]);
  const pan=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    // The row NEVER captures the gesture: the list keeps the vertical scroll
    // and only a clearly horizontal movement is taken.
    onMoveShouldSetPanResponder:(_,g)=>!disabled&&g.dx<0&&Math.abs(g.dx)>TRIGGER_DISTANCE&&Math.abs(g.dx)>Math.abs(g.dy)*INTENT_RATIO,
    onPanResponderGrant:()=>{markSwipeInteraction();if(swipeRegistry.openCloser&&swipeRegistry.openCloser!==close)swipeRegistry.openCloser();},
    onPanResponderMove:(_,g)=>{const raw=current.current+Math.min(0,g.dx);translate.setValue(Math.min(0,Math.max(-INVENTORY_SWIPE_OPEN_WIDTH,raw)));},
    onPanResponderRelease:(_,g)=>{
      const raw=current.current+g.dx;
      const flick=g.vx<=-FLICK_VELOCITY;
      const open=flick||raw<=-OPEN_THRESHOLD;
      if(open&&thresholdArmed.current){thresholdArmed.current=false;hapticIntent('selection');}
      if(!open)thresholdArmed.current=true;
      settle(open?-INVENTORY_SWIPE_OPEN_WIDTH:0);
      setOpen(open);
      if(open)registerOpenCloser(close);
      else if(swipeRegistry.openCloser===close)registerOpenCloser(null);
    },
    onPanResponderTerminate:()=>{close();},
  }).panHandlers,[close,disabled,settle,translate]);
  return <View style={styles.host}>
    <View style={styles.actions} accessibilityElementsHidden={!open} importantForAccessibility={open?'yes':'no-hide-descendants'}>
      {onPrimary?(
        <Pressable style={[styles.action,styles.actionPrimary,primaryDone&&styles.actionDone]} onPress={()=>{close();if(!primaryDone)onPrimary();}} accessibilityRole="button" accessibilityLabel={primaryDone?`${primaryLabel}: ya está en la lista`:`Agregar a la lista: ${primaryLabel}`} accessibilityState={{disabled:primaryDone}}>
          <HomePlusIcon name={primaryDone?'checkmark-circle':'cart-outline'} size={20} color={colors.text.inverse}/>
          <AppText variant="micro" tone="inverse" weight="700">{primaryDone?'En lista':primaryLabel}</AppText>
        </Pressable>
      ):null}
      <Pressable style={[styles.action,styles.actionSecondary]} onPress={event=>{close();onMore(event);}} accessibilityRole="button" accessibilityLabel={secondaryLabel}>
        <HomePlusIcon name="ellipsis-horizontal" size={20} color={colors.text.inverse}/>
        <AppText variant="micro" tone="inverse" weight="700">{secondaryLabel}</AppText>
      </Pressable>
    </View>
    <Animated.View {...pan} style={{transform:[{translateX:translate}]}}>{children}</Animated.View>
  </View>;
}
const styles=StyleSheet.create({host:{overflow:'hidden',backgroundColor:colors.brand},actions:{position:'absolute',right:0,top:0,bottom:0,flexDirection:'row',alignItems:'stretch'},action:{alignItems:'center',justifyContent:'center',gap:2,paddingHorizontal:4},actionPrimary:{width:INVENTORY_SWIPE_PRIMARY_WIDTH,backgroundColor:colors.brand},actionSecondary:{width:INVENTORY_SWIPE_SECONDARY_WIDTH,backgroundColor:colors.text.secondary},actionDone:{backgroundColor:colors.success.base}});
