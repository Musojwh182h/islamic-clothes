import { createDarkTheme, createLightTheme, type BrandVariants } from '@fluentui/react-components'

const sabrBrand: BrandVariants = {
  10: '#021410',
  20: '#06271f',
  30: '#09392e',
  40: '#0c4b3d',
  50: '#0f5d4c',
  60: '#126f5b',
  70: '#17836d',
  80: '#279680',
  90: '#43a993',
  100: '#61bba7',
  110: '#80ccba',
  120: '#9fddcd',
  130: '#beeade',
  140: '#d3f2e8',
  150: '#e5f8f1',
  160: '#f3fcf8',
}

export const sabrLightTheme = {
  ...createLightTheme(sabrBrand),
  fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  borderRadiusMedium: '6px',
  borderRadiusLarge: '8px',
  borderRadiusXLarge: '10px',
}

export const sabrDarkTheme = {
  ...createDarkTheme(sabrBrand),
  fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  borderRadiusMedium: '6px',
  borderRadiusLarge: '8px',
  borderRadiusXLarge: '10px',
}
