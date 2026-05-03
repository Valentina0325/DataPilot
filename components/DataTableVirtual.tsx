'use client';
import { FixedSizeList} from 'react-window';

interface DataTableVirtualProps {
  headers: string[];
  rows: any[];
  rowHeight?: number;
  height?: number;
}

export function DataTableVirtual({ headers, rows, rowHeight = 50, height = 500 }: DataTableVirtualProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = rows[index];
    return (
      <div style={style} className="flex border-b hover:bg-blue-50">
        {headers.map((header) => (
          <div
            key={header}
            className="px-4 py-2 text-sm text-gray-600 truncate"
            style={{ flex: 1, minWidth: 100 }}
          >
            {row[header]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border rounded-xl shadow-sm overflow-auto">
      {/* 固定表头 */}
      <div className="flex bg-gray-50 sticky top-0 z-10 border-b">
        {headers.map((header) => (
          <div
            key={header}
            className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
            style={{ flex: 1, minWidth: 100 }}
          >
            {header}
          </div>
        ))}
      </div>
      {/* 虚拟滚动列表 */}
      <FixedSizeList
        height={height}
        itemCount={rows.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}