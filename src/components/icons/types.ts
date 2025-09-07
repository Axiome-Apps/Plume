import { ComponentProps } from 'react';

export interface IconProps extends Omit<ComponentProps<'svg'>, 'children'> {
  size?: number;
}
