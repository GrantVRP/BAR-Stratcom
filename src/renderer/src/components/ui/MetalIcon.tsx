import React from 'react';

export interface MetalIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}
export type ResourceIconProps = MetalIconProps;

export const MetalIcon: React.FC<MetalIconProps> = ({ size = 16, className = '', ...props }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixelated align-middle ${className}`.trim()}
      aria-label="Metal resource"
      {...props}
    >
      {/* 16x16 Original Pixel Metal Ingot */}
      {/* Top tier */}
      <rect x="5" y="2" width="6" height="2" fill="#e2e8f0" />
      <rect x="4" y="4" width="8" height="2" fill="#cbd5e1" />
      <rect x="11" y="2" width="1" height="4" fill="#64748b" />

      {/* Main ingot body */}
      <rect x="2" y="6" width="12" height="7" fill="#64748b" />
      <rect x="2" y="6" width="12" height="1" fill="#94a3b8" />
      <rect x="2" y="6" width="1" height="7" fill="#cbd5e1" />
      <rect x="13" y="6" width="1" height="7" fill="#334155" />
      <rect x="2" y="12" width="12" height="1" fill="#1e293b" />

      {/* Inner emboss */}
      <rect x="5" y="8" width="6" height="1" fill="#94a3b8" />
      <rect x="5" y="9" width="6" height="1" fill="#334155" />

      {/* Outer border pixels */}
      <rect x="5" y="1" width="6" height="1" fill="#000000" />
      <rect x="4" y="2" width="1" height="2" fill="#000000" />
      <rect x="11" y="2" width="1" height="2" fill="#000000" />
      <rect x="3" y="4" width="1" height="2" fill="#000000" />
      <rect x="12" y="4" width="1" height="2" fill="#000000" />
      <rect x="1" y="6" width="1" height="7" fill="#000000" />
      <rect x="14" y="6" width="1" height="7" fill="#000000" />
      <rect x="2" y="13" width="12" height="1" fill="#000000" />
    </svg>
  );
};
