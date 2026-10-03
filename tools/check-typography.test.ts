import { describe, expect, it } from 'vitest';
import { checkArbitraryFontSizes, checkDataNumTypography, checkTypography } from './check-typography';

describe('checkArbitraryFontSizes', () => {
  it('detects font sizes below 10px in Tailwind arbitrary classes', () => {
    const code = '<span className="text-[8px] font-bold">Small</span>\n<div className="text-[9.5px]" />';
    const errors = checkArbitraryFontSizes('test.tsx', code);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.message).toContain('text-[8px]');
    expect(errors[1]?.message).toContain('text-[9.5px]');
  });

  it('detects rem font sizes below 0.625rem', () => {
    const code = '<span className="text-[0.5rem]">Small</span>';
    const errors = checkArbitraryFontSizes('test.tsx', code);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('text-[0.5rem]');
  });

  it('permits font sizes >= 10px and standard classes', () => {
    const code = '<span className="text-[10px] text-[14px] text-xs text-sm">Fine</span>';
    const errors = checkArbitraryFontSizes('test.tsx', code);
    expect(errors).toHaveLength(0);
  });

  it('detects font-size below 10px in CSS files', () => {
    const css = '.bad { font-size: 8px; }\n.good { font-size: 14px; font-size: 0; }';
    const errors = checkArbitraryFontSizes('test.css', css);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('font-size: 8px');
  });
});

describe('checkDataNumTypography', () => {
  it('flags elements with data-num and font-pixel-heading or font-pixel-body', () => {
    const code = `
      export function Test() {
        return (
          <div>
            <span data-num="true" className="font-pixel-heading text-sm">123</span>
            <div data-num className="font-pixel-body">456</div>
          </div>
        );
      }
    `;
    const errors = checkDataNumTypography('test.tsx', code);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.message).toContain('JetBrains Mono');
    expect(errors[1]?.message).toContain('JetBrains Mono');
  });

  it('flags Num component if given font-pixel-heading or font-pixel-body', () => {
    const code = `
      export function Test() {
        return <Num className="font-pixel-heading" value={42} />;
      }
    `;
    const errors = checkDataNumTypography('test.tsx', code);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('JetBrains Mono');
  });

  it('permits Num with default or font-mono classes', () => {
    const code = `
      export function Test() {
        return (
          <div>
            <Num value={42} />
            <span data-num="true" className="font-mono text-sm">100</span>
          </div>
        );
      }
    `;
    const errors = checkDataNumTypography('test.tsx', code);
    expect(errors).toHaveLength(0);
  });
});

describe('checkTypography on src/renderer', () => {
  it('passes on all files currently in src/renderer', () => {
    const ok = checkTypography();
    expect(ok).toBe(true);
  });
});
