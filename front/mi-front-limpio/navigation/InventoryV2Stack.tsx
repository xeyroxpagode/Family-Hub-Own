import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {InventoryV2Provider,useInventoryV2} from '../context/InventoryV2Context';
import {BottomChromeProvider} from '../context/BottomChromeContext';
import {AppToastHost} from '../components/ui';
import type {InventoryCategoryKey} from '../services/inventoryV2Presentation';
import {
  AllProductsScreen,ArchivedProductsScreen,InventoryLocationsScreen,InventoryProductsRootScreen,
  InventoryTrashScreen,LocationDetailScreen,
} from '../screens/inventory/v2/InventoryV2Screens';
import {InventoryPurchaseDetailScreen,InventoryPurchaseHistoryScreen,InventoryPurchaseScreen,InventoryPurchaseSuccessScreen,InventoryShoppingScreen} from '../screens/inventory/v2/InventoryShoppingPurchaseScreens';
import {InventoryWorkspaceScreen} from '../screens/inventory/v2/InventoryWorkspaceScreen';
import {InventoryPremiumQAScreen} from '../screens/inventory/v2/InventoryPremiumQAScreen';

export type InventoryStackParamList={
  InventoryWorkspace:{tab?:'products'|'shopping';openAddNonce?:number}|undefined;
  ProductsHome:undefined;
  AllProducts:{stockState?:'out'|'low';locationId?:string;unlocated?:boolean;category?:InventoryCategoryKey}|undefined;
  Locations:undefined;
  LocationDetail:{locationId:string|null;title:string};
  ArchivedProducts:undefined;
  InventoryTrash:undefined;
  ShoppingHome:undefined;
  Purchase:{id:string};
  PurchaseSuccess:{purchasedCount:number;remainingCount:number;newIds:string[];financeStatus:string;purchaseId:string};
  PurchaseHistory:undefined;
  PurchaseDetail:{id:string};
  InventoryPremiumQA:undefined;
};
const Stack=createNativeStackNavigator<InventoryStackParamList>();
function InventoryV2StackContent(){const {toast,dismissToast,sheetOpen}=useInventoryV2();return <><Stack.Navigator initialRouteName="InventoryWorkspace" screenOptions={{headerShown:false,animation:'fade_from_bottom'}}><Stack.Screen name="InventoryWorkspace" component={InventoryWorkspaceScreen}/><Stack.Screen name="ProductsHome" component={InventoryProductsRootScreen}/><Stack.Screen name="ShoppingHome" component={InventoryShoppingScreen}/><Stack.Screen name="AllProducts" component={AllProductsScreen}/><Stack.Screen name="Locations" component={InventoryLocationsScreen}/><Stack.Screen name="LocationDetail" component={LocationDetailScreen}/><Stack.Screen name="ArchivedProducts" component={ArchivedProductsScreen}/><Stack.Screen name="InventoryTrash" component={InventoryTrashScreen}/><Stack.Screen name="Purchase" component={InventoryPurchaseScreen}/><Stack.Screen name="PurchaseSuccess" component={InventoryPurchaseSuccessScreen}/><Stack.Screen name="PurchaseHistory" component={InventoryPurchaseHistoryScreen}/><Stack.Screen name="PurchaseDetail" component={InventoryPurchaseDetailScreen}/>{__DEV__?<Stack.Screen name="InventoryPremiumQA" component={InventoryPremiumQAScreen}/>:null}</Stack.Navigator><AppToastHost toast={toast} onDismiss={dismissToast} sheetOpen={sheetOpen}/></>}
export function InventoryV2StackScreen(){return <InventoryV2Provider><BottomChromeProvider><InventoryV2StackContent/></BottomChromeProvider></InventoryV2Provider>}
