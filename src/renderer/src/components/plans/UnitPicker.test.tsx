// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnitPicker } from './UnitPicker';
import { useSnapshot } from '../../stores';
import testSnapshot from '../../../../core/registry/__test__/test-snapshot.json';
import type { UnitSnapshot } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('UnitPicker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useSnapshot.setState({ snapshot: testSnapshot as unknown as UnitSnapshot });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders buildable units for commander', () => {
    act(() => {
      root.render(
        <UnitPicker
          isOpen={true}
          actor={{ kind: 'commander' }}
          faction="armada"
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    const modal = container.querySelector('[data-testid="unit-picker-modal"]');
    expect(modal).not.toBeNull();

    // armsolar should be buildable by armcom
    const solarBtn = container.querySelector('[data-testid="picker-unit-armsolar"]');
    expect(solarBtn).not.toBeNull();
  });

  it('filters units when searching', () => {
    act(() => {
      root.render(
        <UnitPicker
          isOpen={true}
          actor={{ kind: 'commander' }}
          faction="armada"
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    const searchInput = container.querySelector<HTMLInputElement>('input[data-testid="input-picker-search"]');
    expect(searchInput).not.toBeNull();

    act(() => {
      searchInput!.value = 'solar';
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const solarBtn = container.querySelector('[data-testid="picker-unit-armsolar"]');
    expect(solarBtn).not.toBeNull();
  });

  it('calls onSelect and onClose when a unit is chosen', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <UnitPicker
          isOpen={true}
          actor={{ kind: 'commander' }}
          faction="armada"
          onSelect={handleSelect}
          onClose={handleClose}
        />
      );
    });

    const solarBtn = container.querySelector<HTMLButtonElement>('[data-testid="picker-unit-armsolar"]');
    act(() => {
      solarBtn?.click();
    });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'armsolar' }),
      expect.objectContaining({ kind: 'commander' })
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    act(() => {
      root.render(
        <UnitPicker
          isOpen={false}
          actor={{ kind: 'commander' }}
          faction="armada"
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-testid="unit-picker-modal"]')).toBeNull();
  });
});
