// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import {
  Button,
  Panel,
  Inset,
  Tag,
  Tabs,
  Input,
  Select,
  Slider,
  Toggle,
  Drawer,
  Dialog,
  Provenance,
  Num,
  Kbd,
  MetalIcon,
  EnergyIcon
} from './index';

describe('UI Primitives (06 §3, T06.1)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Button with variants and handles click', () => {
    const handleClick = vi.fn();
    act(() => {
      root.render(
        <Button variant="armada" size="sm" onClick={handleClick}>
          CLICK ME
        </Button>
      );
    });

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('CLICK ME');
    expect(btn?.className).toContain('pixel-btn');
    expect(btn?.className).toContain('pixel-btn-armada');
    expect(btn?.className).toContain('text-[10px]');

    act(() => {
      btn?.click();
    });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Panel and Inset with proper pixel classes', () => {
    act(() => {
      root.render(
        <div>
          <Panel variant="cortex">Cortex Panel</Panel>
          <Inset>Inset Well</Inset>
        </div>
      );
    });

    expect(container.querySelector('.pixel-box-cortex')).not.toBeNull();
    expect(container.querySelector('.pixel-box-inset')).not.toBeNull();
  });

  it('renders Tag with variants and min 10px text', () => {
    act(() => {
      root.render(<Tag variant="good">VALID</Tag>);
    });

    const tag = container.querySelector('span');
    expect(tag).not.toBeNull();
    expect(tag?.className).toContain('font-pixel-heading');
    expect(tag?.className).toContain('text-[10px]');
    expect(tag?.textContent).toBe('VALID');
  });

  it('renders Tabs and handles tab switching', () => {
    const handleChange = vi.fn();
    const tabs = [
      { id: 'tab1', label: 'FIRST' },
      { id: 'tab2', label: 'SECOND', count: 5 }
    ];

    act(() => {
      root.render(<Tabs tabs={tabs} activeId="tab1" onChange={handleChange} variant="armada" />);
    });

    const buttons = container.querySelectorAll('button[role="tab"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.className).toContain('active-armada');

    act(() => {
      (buttons[1] as HTMLButtonElement).click();
    });
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('renders Input and Select', () => {
    act(() => {
      root.render(
        <div>
          <Input placeholder="Search..." isError={false} defaultValue="Initial" />
          <Select
            options={[
              { value: 'opt1', label: 'Option 1' },
              { value: 'opt2', label: 'Option 2' }
            ]}
            defaultValue="opt1"
          />
        </div>
      );
    });

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.className).toContain('pixel-box-inset');
    expect(input?.className).toContain('font-mono');

    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    expect(select?.value).toBe('opt1');
  });

  it('renders Slider and Toggle', () => {
    const handleSlider = vi.fn();
    const handleToggle = vi.fn();

    act(() => {
      root.render(
        <div>
          <Slider value={50} min={0} max={100} label="VOLUME" unit="%" onChange={handleSlider} />
          <Toggle checked={false} onChange={handleToggle} label="HUD" />
        </div>
      );
    });

    expect(container.textContent).toContain('VOLUME');
    const numEl = container.querySelector('[data-num="true"]');
    expect(numEl?.textContent).toBe('50%');

    const switchBtn = container.querySelector('button[role="switch"]');
    expect(switchBtn).not.toBeNull();
    act(() => {
      (switchBtn as HTMLButtonElement).click();
    });
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it('renders Drawer and Dialog with keyboard Esc listener', () => {
    const handleCloseDrawer = vi.fn();
    act(() => {
      root.render(
        <Drawer open={true} onClose={handleCloseDrawer} title="TEST DRAWER">
          <p>Drawer Content</p>
        </Drawer>
      );
    });

    expect(container.textContent).toContain('TEST DRAWER');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handleCloseDrawer).toHaveBeenCalledTimes(1);

    const handleCloseDialog = vi.fn();
    act(() => {
      root.render(
        <Dialog open={true} onClose={handleCloseDialog} title="TEST DIALOG">
          <button type="button">Focus Target</button>
        </Dialog>
      );
    });

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handleCloseDialog).toHaveBeenCalledTimes(1);
  });

  it('renders Provenance badges for all 5 kinds', () => {
    const kinds = ['MEASURED', 'SIMULATED', 'ESTIMATED', 'AI DRAFT', 'UNKNOWN'] as const;

    for (const k of kinds) {
      act(() => {
        root.render(<Provenance kind={k} />);
      });
      const badge = container.querySelector('span');
      expect(badge?.textContent).toBe(k);
      expect(badge?.getAttribute('title')).toBeTruthy();
    }
  });

  it('renders Num with data-num attribute and JetBrains Mono', () => {
    act(() => {
      root.render(<Num value={42.5} unit=" M/s" sign={true} prefix="NET " />);
    });

    const num = container.querySelector('span');
    expect(num?.textContent).toBe('NET +42.5 M/s');
    expect(num?.getAttribute('data-num')).toBe('true');
    expect(num?.className).toContain('font-mono');
    expect(num?.className).toContain('text-[14px]');
  });

  it('renders Kbd and Resource Icons', () => {
    act(() => {
      root.render(
        <div>
          <Kbd>Alt+1</Kbd>
          <MetalIcon size={20} />
          <EnergyIcon size={20} />
        </div>
      );
    });

    expect(container.querySelector('kbd')?.textContent).toBe('Alt+1');
    expect(container.querySelector('svg[aria-label="Metal resource"]')).not.toBeNull();
    expect(container.querySelector('svg[aria-label="Energy resource"]')).not.toBeNull();
  });
});
