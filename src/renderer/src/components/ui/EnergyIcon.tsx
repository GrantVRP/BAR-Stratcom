import React from 'react';

export interface EnergyIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const EnergyIcon: React.FC<EnergyIconProps> = ({ size = 16, className = '', ...props }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixelated align-middle ${className}`.trim()}
      aria-label="Energy resource"
      {...props}
    >
      {/* 16x16 Original Tactical Pixel Energy Bolt */}
      {/* Core highlight */}
      <rect x="8" y="2" width="2" height="2" fill="#fef08a" />
      <rect x="7" y="4" width="2" height="2" fill="#fef08a" />
      <rect x="6" y="6" width="3" height="2" fill="#fef08a" />
      <rect x="5" y="8" width="6" height="1" fill="#fef08a" />
      <rect x="7" y="9" width="3" height="2" fill="#fef08a" />
      <rect x="6" y="11" width="2" height="2" fill="#fef08a" />
      <rect x="5" y="13" width="1" height="1" fill="#fef08a" />

      {/* Main amber gold fill */}
      <rect x="7" y="2" width="1" height="2" fill="#fbbf24" />
      <rect x="10" y="2" width="1" height="2" fill="#d97706" />
      <rect x="6" y="4" width="1" height="2" fill="#fbbf24" />
      <rect x="9" y="4" width="1" height="2" fill="#d97706" />
      <rect x="5" y="6" width="1" height="2" fill="#fbbf24" />
      <rect x="9" y="6" width="1" height="2" fill="#d97706" />
      <rect x="4" y="8" width="1" height="1" fill="#fbbf24" />
      <rect x="11" y="8" width="1" height="1" fill="#d97706" />
      <rect x="6" y="9" width="1" height="2" fill="#fbbf24" />
      <rect x="10" y="9" width="1" height="2" fill="#d97706" />
      <rect x="5" y="11" width="1" height="2" fill="#fbbf24" />
      <rect x="8" y="11" width="1" height="2" fill="#d97706" />
      <rect x="4" y="13" width="1" height="1" fill="#fbbf24" />
      <rect x="6" y="13" width="1" height="1" fill="#d97706" />

      {/* Black pixel silhouette border */}
      <rect x="7" y="1" width="4" height="1" fill="#000000" />
      <rect x="6" y="2" width="1" height="2" fill="#000000" />
      <rect x="11" y="2" width="1" height="2" fill="#000000" />
      <rect x="5" y="4" width="1" height="2" fill="#000000" />
      <rect x="10" y="4" width="1" height="2" fill="#000000" />
      <rect x="4" y="6" width="1" height="2" fill="#000000" />
      <rect x="10" y="6" width="2" height="1" fill="#000000" />
      <rect x="3" y="8" width="1" height="1" fill="#000000" />
      <rect x="12" y="8" width="1" height="1" fill="#000000" />
      <rect x="4" y="9" width="2" height="1" fill="#000000" />
      <rect x="11" y="9" width="1" height="2" fill="#000000" />
      <rect x="5" y="10" width="1" height="1" fill="#000000" />
      <rect x="9" y="11" width="1" height="2" fill="#000000" />
      <rect x="4" y="11" width="1" height="2" fill="#000000" />
      <rect x="3" y="13" width="1" height="2" fill="#000000" />
      <rect x="7" y="13" width="1" height="1" fill="#000000" />
      <rect x="4" y="14" width="1" height="1" fill="#000000" />
      <rect x="5" y="14" width="2" height="1" fill="#000000" />
    </svg>
  );
};
