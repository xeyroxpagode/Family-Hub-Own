import React from 'react';

import { HomePlusIcon } from '../../constants/icons';
import { colors } from '../../constants/theme';
import { AppInput, type AppInputProps } from './AppInput';

export type SearchFieldProps = Omit<AppInputProps, 'label' | 'variant'> & {
  label?: string;
};

export function SearchField({ label = 'Buscar', placeholder = 'Buscar', inputStyle, ...props }: SearchFieldProps) {
  return (
    <AppInput
      {...props}
      label={label}
      variant="search"
      placeholder={placeholder}
      inputStyle={[
        {
          paddingLeft: 44,
        },
        inputStyle,
      ]}
    />
  );
}

export function SearchIconOverlay() {
  return <HomePlusIcon name="search-outline" size={18} color={colors.text.tertiary} />;
}
