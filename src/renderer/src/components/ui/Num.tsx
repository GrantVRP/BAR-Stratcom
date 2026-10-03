import React from 'react';

export interface NumProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | string;
  unit?: string;
  prefix?: string;
  sign?: boolean;
}

export const Num: React.FC<NumProps> = ({
  value,
  unit = '',
  prefix = '',
  sign = false,
  className = '',
  ...props
}) => {
  let displayValue: string;

  if (typeof value === 'number') {
    if (sign && value > 0) {
      displayValue = `+${value}`;
    } else {
      displayValue = String(value);
    }
  } else {
    displayValue = value;
  }

  return (
    <span data-num="true" className={`font-mono text-[14px] tabular-nums ${className}`.trim()} {...props}>
      {prefix}
      {displayValue}
      {unit}
    </span>
  );
};
