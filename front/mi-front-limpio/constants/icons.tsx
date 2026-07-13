import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export const APP_ICONS = {
  bottomTabs: {
    home: 'home',
    people: 'people',
    planner: 'calendar',
    more: 'ellipsis-horizontal',
    add: 'add',
  },
  quickActions: {
    createTask: 'checkbox',
    editTask: 'create',
    createEvent: 'calendar',
    editEvent: 'calendar-outline',
    invite: 'person-add',
    geni: 'sparkles',
  },
  home: {
    myHome: 'home',
    schedule: 'calendar',
    tasks: 'clipboard',
    groceries: 'cart',
    routines: 'repeat',
    finances: 'wallet',
    inventory: 'archive',
    reminders: 'notifications',
    geni: 'sparkles',
  },
  people: {
    family: 'people',
    contacts: 'person',
    groups: 'people-circle',
    birthdays: 'gift',
    helpers: 'hand-left',
    messages: 'chatbubbles',
    invite: 'person-add',
    role: 'ribbon',
  },
  planner: {
    calendar: 'calendar',
    todo: 'checkbox',
    schedule: 'time',
    goals: 'flag',
    notes: 'document-text',
    overview: 'bar-chart',
    trash: 'trash',
  },
  more: {
    settings: 'settings',
    notifications: 'notifications',
    privacy: 'shield-checkmark',
    appearance: 'color-palette',
    finance: 'wallet',
    inventory: 'archive',
    assets: 'cube',
    cloud: 'cloud',
  },
} as const;

export type HomePlusIconName = IoniconName;

export function HomePlusIcon({
  name,
  size = 22,
  color,
  style,
}: {
  name: IoniconName;
  size?: number;
  color: string;
  style?: React.ComponentProps<typeof Ionicons>['style'];
}) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}