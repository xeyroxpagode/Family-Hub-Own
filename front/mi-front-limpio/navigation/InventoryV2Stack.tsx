import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {InventoryV2Provider,useInventoryV2} from '../context/InventoryV2Context';
import {AppToastHost} from '../components/ui';
import type {InventoryCategoryKey} from '../services/inventoryV2Presentation';
import {
  AllProductsScreen,ArchivedProductsScreen,InventoryLocationsScreen,InventoryProductsRootScreen,
  InventoryTrashScreen,LocationDetailScreen,
} from '../screens/inventory/v2/InventoryV2Screens';

export type InventoryStackParamList={
  ProductsHome:undefined;
  AllProducts:{stockState?:'out'|'low';locationId?:string;unlocated?:boolean;category?:InventoryCategoryKey}|undefined;
  Locations:undefined;
  LocationDetail:{locationId:string|null;title:string};
  ArchivedProducts:undefined;
  InventoryTrash:undefined;
};
const Stack=createNativeStackNavigator<InventoryStackParamList>();
function InventoryV2StackContent(){const {toast,dismissToast,sheetOpen}=useInventoryV2();return <><Stack.Navigator initialRouteName="ProductsHome" screenOptions={{headerShown:false,animation:'fade_from_bottom'}}><Stack.Screen name="ProductsHome" component={InventoryProductsRootScreen}/><Stack.Screen name="AllProducts" component={AllProductsScreen}/><Stack.Screen name="Locations" component={InventoryLocationsScreen}/><Stack.Screen name="LocationDetail" component={LocationDetailScreen}/><Stack.Screen name="ArchivedProducts" component={ArchivedProductsScreen}/><Stack.Screen name="InventoryTrash" component={InventoryTrashScreen}/></Stack.Navigator><AppToastHost toast={toast} onDismiss={dismissToast} sheetOpen={sheetOpen}/></>}
export function InventoryV2StackScreen(){return <InventoryV2Provider><InventoryV2StackContent/></InventoryV2Provider>}
