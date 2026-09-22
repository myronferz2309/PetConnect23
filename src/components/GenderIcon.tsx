import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';

interface GenderIconProps {
  gender: 'female' | 'male' | string;
  size?: number;
  color?: string;
}

export const GenderIcon: React.FC<GenderIconProps> = ({
  gender,
  size = 18,
  color = '#576159',
}) => {
  const isFemale = gender ? gender.toLowerCase() === 'female' : false;

  if (isFemale) {
    // Female symbol ♀: Circle with cross attached at bottom
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx="12" cy="9" r="6" />
        <Line x1="12" y1="15" x2="12" y2="22" />
        <Line x1="8.5" y1="18.5" x2="15.5" y2="18.5" />
      </Svg>
    );
  }

  // Male symbol ♂: Circle with arrow pointing to top-right
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="10" cy="14" r="6" />
      <Line x1="14.2" y1="9.8" x2="20" y2="4" />
      <Path d="M15 4h5v5" />
    </Svg>
  );
};
