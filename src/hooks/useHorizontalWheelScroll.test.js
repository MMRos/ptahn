import { renderHook } from '@testing-library/react';
import { useHorizontalWheelScroll } from './useHorizontalWheelScroll';

describe('useHorizontalWheelScroll', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
    container.scrollLeft = 100;
  });

  test('converts vertical deltaY into horizontal scrollLeft and prevents default', () => {
    const ref = { current: container };
    renderHook(() => useHorizontalWheelScroll(ref));

    const event = new Event('wheel');
    event.deltaY = 50;
    event.preventDefault = jest.fn();

    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(container.scrollLeft).toBe(150);
  });

  test('does not prevent default when already at boundary', () => {
    container.scrollLeft = 600; // maxScrollLeft = 1000 - 400 = 600
    const ref = { current: container };
    renderHook(() => useHorizontalWheelScroll(ref));

    const event = new Event('wheel');
    event.deltaY = 50; // trying to scroll further right
    event.preventDefault = jest.fn();

    container.dispatchEvent(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(container.scrollLeft).toBe(600);
  });

  test('removes wheel event listener on unmount', () => {
    const ref = { current: container };
    const removeSpy = jest.spyOn(container, 'removeEventListener');

    const { unmount } = renderHook(() => useHorizontalWheelScroll(ref));
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
  });

  test('attaches dynamically when element was initially null (conditional row rendering)', () => {
    const ref = { current: null };
    const { rerender } = renderHook(() => useHorizontalWheelScroll(ref));

    // Element appears on subsequent render
    ref.current = container;
    rerender();

    const event = new Event('wheel');
    event.deltaY = 30;
    event.preventDefault = jest.fn();

    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(container.scrollLeft).toBe(130);
  });

  test('supports callbackRef pattern', () => {
    let hookRef;
    renderHook(() => {
      hookRef = useHorizontalWheelScroll();
    });

    // Attach via callbackRef
    hookRef.callbackRef(container);

    const event = new Event('wheel');
    event.deltaY = 40;
    event.preventDefault = jest.fn();

    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(container.scrollLeft).toBe(140);
  });
});
