import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from 'src/lib/utils';

interface MasonryProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Rough rendered height for a given column width; drives placement. */
  estimateHeight: (item: T, columnWidth: number) => number;
  render: (item: T, index: number) => ReactNode;
  minColumnWidth?: number;
  minColumns?: number;
  gap?: number;
  className?: string;
}

/**
 * Shortest-column masonry. Unlike CSS columns, it keeps chronological order
 * left-to-right and items never jump columns when more pages load.
 */
export function Masonry<T>({
  items,
  getKey,
  estimateHeight,
  render,
  minColumnWidth = 244,
  minColumns = 2,
  gap = 16,
  className,
}: MasonryProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columnCount = Math.max(
    minColumns,
    Math.floor((width + gap) / (minColumnWidth + gap)) || minColumns,
  );
  const columnWidth = width
    ? (width - gap * (columnCount - 1)) / columnCount
    : 0;

  const columns = useMemo(() => {
    const cols: { item: T; index: number }[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    const heights = new Array<number>(columnCount).fill(0);
    items.forEach((item, index) => {
      let target = 0;
      for (let c = 1; c < columnCount; c++) {
        if ((heights[c] ?? 0) < (heights[target] ?? 0) - 1) target = c;
      }
      cols[target]?.push({ item, index });
      heights[target] =
        (heights[target] ?? 0) + estimateHeight(item, columnWidth || 240) + gap;
    });
    return cols;
  }, [items, columnCount, columnWidth, estimateHeight, gap]);

  return (
    <div
      ref={ref}
      className={cn('flex w-full items-start', className)}
      style={{ gap }}
    >
      {width > 0 &&
        columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
            {col.map(({ item, index }) => (
              <div key={getKey(item)}>{render(item, index)}</div>
            ))}
          </div>
        ))}
    </div>
  );
}
