import { renderHook, act } from '@testing-library/react';
import { useDragDropReorder } from './useDragDropReorder';

describe('useDragDropReorder', () => {
  const sampleItems = [
    { id: '1', title: 'Tarjeta 1' },
    { id: '2', title: 'Tarjeta 2' },
    { id: '3', title: 'Tarjeta 3' }
  ];

  test('provides drag and drop props for items with area identification', () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragDropReorder({
      items: sampleItems,
      onReorder,
      areaId: 'area-test'
    }));

    const props0 = result.current.getItemProps(0);
    expect(props0.draggable).toBe(true);
    expect(props0['data-drag-index']).toBe(0);
    expect(props0['data-drag-area']).toBe('area-test');
  });

  test('reorders items and calls onReorder when drop occurs in the same area', () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragDropReorder({
      items: sampleItems,
      onReorder,
      areaId: 'area-test'
    }));

    const mockDataStore = {};
    const mockDataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      types: ['text/plain', 'application/ptahn-area-id'],
      setData: jest.fn((key, val) => { mockDataStore[key] = val; }),
      getData: jest.fn((key) => mockDataStore[key])
    };

    const dragStartEvent = {
      dataTransfer: mockDataTransfer
    };
    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer
    };

    // 1. Drag start on index 0
    act(() => {
      result.current.getItemProps(0).onDragStart(dragStartEvent);
    });
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('application/ptahn-area-id', 'area-test');

    // 2. Drop on index 2
    act(() => {
      result.current.getItemProps(2).onDrop(dropEvent);
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const [reordered, movedItem, fromIdx, toIdx] = onReorder.mock.calls[0];
    expect(fromIdx).toBe(0);
    expect(toIdx).toBe(2);
    expect(movedItem.id).toBe('1');
    expect(reordered.map(i => i.id)).toEqual(['2', '3', '1']);
  });

  test('rejects drop if source area does not match target area', () => {
    const onReorder = jest.fn();
    const { result } = renderHook(() => useDragDropReorder({
      items: sampleItems,
      onReorder,
      areaId: 'area-target'
    }));

    const mockDataTransfer = {
      types: ['text/plain', 'application/ptahn-area-id'],
      getData: jest.fn((key) => {
        if (key === 'application/ptahn-area-id') return 'area-different';
        if (key === 'text/plain') return '0';
        return '';
      })
    };

    const dropEvent = {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer
    };

    act(() => {
      result.current.getItemProps(1).onDrop(dropEvent);
    });

    expect(onReorder).not.toHaveBeenCalled();
  });

  test('defers draggedIndex update so drag preview is captured fully opaque', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useDragDropReorder({
      items: sampleItems,
      areaId: 'area-test'
    }));

    const mockDataTransfer = {
      effectAllowed: '',
      setData: jest.fn()
    };

    act(() => {
      result.current.getItemProps(1).onDragStart({ dataTransfer: mockDataTransfer });
    });

    // Synchronously right after dragstart, draggedIndex is still null (opaque snapshot captured)
    expect(result.current.draggedIndex).toBeNull();

    // Fast-forward next tick timer
    act(() => {
      jest.runAllTimers();
    });

    // Now draggedIndex is 1 for on-board slot dimming
    expect(result.current.draggedIndex).toBe(1);
    jest.useRealTimers();
  });
});
