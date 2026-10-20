import React,{useEffect,useMemo,useRef} from 'react';
import {Animated,PanResponder,Pressable,StyleSheet,View,type GestureResponderEvent} from 'react-native';
import {AppText} from '../ui';
import {colors} from '../../constants/theme';

let openCloser:(()=>void)|null=null;
// Marca de la última interacción de swipe. En web (RNW) el mouse-up de un
// drag dispara además el click de la fila; los consumidores usan esta marca
// para distinguir "press real" de "press colateral del swipe".
export let inventorySwipeInteractionAt=0;
export const closeOpenInventorySwipe=()=>{openCloser?.();openCloser=null;};
export function InventorySwipeRow({children,onMore,onFullSwipe,actionLabel='Más',disabled=false,closeSignal}:{children:React.ReactNode;onMore:(event:GestureResponderEvent)=>void;onFullSwipe?:()=>void;actionLabel?:string;disabled?:boolean;closeSignal?:unknown}){
  const translate=useRef(new Animated.Value(0)).current;const current=useRef(0);const width=useRef(0);
  const settle=(toValue:number)=>Animated.spring(translate,{toValue,useNativeDriver:true,overshootClamping:true,damping:24,stiffness:280,mass:.8}).start(()=>{current.current=toValue;});
  const close=()=>settle(0);
  useEffect(()=>{close();},[closeSignal]);
  useEffect(()=>()=>{if(openCloser===close)openCloser=null;},[]);
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>!disabled&&g.dx<0&&Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.15,
    onPanResponderGrant:()=>{inventorySwipeInteractionAt=Date.now();if(openCloser&&openCloser!==close)openCloser();},
    onPanResponderMove:(_,g)=>{const raw=current.current+Math.min(0,g.dx);translate.setValue(raw>=-72?raw:-72+(raw+72)*.25);},
    onPanResponderRelease:(_,g)=>{const raw=current.current+g.dx;const full=Boolean(onFullSwipe)&&((width.current>0&&raw<=-width.current*.75)||g.vx<=-1.2);if(full){inventorySwipeInteractionAt=Date.now();settle(-Math.max(width.current,72));onFullSwipe?.();return;}const next=raw<=-32||g.vx<=-.35?-72:0;settle(next);if(next<0)openCloser=close;},
    onPanResponderTerminate:()=>settle(current.current),
  }).panHandlers,[disabled,onFullSwipe]);
  return <View style={styles.host} onLayout={event=>{width.current=event.nativeEvent.layout.width;}}><Pressable style={styles.action} onPress={event=>{close();onMore(event);}} accessibilityRole="button" accessibilityLabel={actionLabel}><AppText tone="inverse" weight="700">{actionLabel}</AppText></Pressable><Animated.View {...pan} style={{transform:[{translateX:translate}]}}>{children}</Animated.View></View>;
}
const styles=StyleSheet.create({host:{overflow:'hidden',backgroundColor:colors.brand},action:{position:'absolute',right:0,top:0,bottom:0,width:72,alignItems:'center',justifyContent:'center'}});
