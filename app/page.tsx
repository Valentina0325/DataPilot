/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */ // 允许恢复状态时多次 setState
'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import ReactECharts from 'echarts-for-react';
import debounce from 'lodash.debounce';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableVirtual } from '@/components/DataTableVirtual';
interface CSVFile {
  id: string;
  name: string;
  headers: string[];
  rows: any[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

export default function Home() {
  // 多文件状态
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  // 图表状态
  const [chartOption, setChartOption] = useState<any>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xKey, setXKey] = useState<string>('');
  const [yKey, setYKey] = useState<string>('');

  // AI 报告
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 图表 ref，用于导出图片
  const chartRef = useRef<ReactECharts>(null);

  // 当前选中的文件
  const currentFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);
  const headers = currentFile?.headers || [];
  const rows = currentFile?.rows || [];

  // 缓存统计数据（用于 AI 报告）
  const stats = useMemo(() => {
    if (!rows.length || !yKey) return null;
    const yValues = rows.map(row => parseFloat(row[yKey])).filter(v => !isNaN(v));
    if (yValues.length === 0) return null;
    const count = yValues.length;
    const sum = yValues.reduce((a, b) => a + b, 0);
    const max = Math.max(...yValues);
    const min = Math.min(...yValues);
    const avg = sum / count;
    const sorted = [...yValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { count, sum, max, min, avg, median };
  }, [rows, yKey]);

  // 保存到 localStorage
  const saveStateToLocalStorage = () => {
    const stateToSave = { files, selectedFileId, xKey, yKey, chartType, chartOption, aiReport };
    try {
      localStorage.setItem('dashboard-state', JSON.stringify(stateToSave));
    } catch (err) { console.warn(err); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      setFiles(parsed.files || []);
      setSelectedFileId(parsed.selectedFileId || null);
      setXKey(parsed.xKey || '');
      setYKey(parsed.yKey || '');
      setChartType(parsed.chartType || 'bar');
      setChartOption(parsed.chartOption || null);
      setAiReport(parsed.aiReport || '');
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (files.length > 0 || selectedFileId !== null || xKey || yKey) {
      saveStateToLocalStorage();
    }
  }, [files, selectedFileId, xKey, yKey, chartType, chartOption, aiReport]);

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { setError(`文件 ${file.name} 超过 5MB，已跳过`); return; }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ",",
        transformHeader: (h: string) => h.trim(),
        complete: (results) => {
          if (results.errors.length) { setError(`解析 ${file.name}错误: ${results.errors[0].message}`); return; }
          if (results.data && results.data.length) {
            const firstRow = results.data[0] as Record<string, any>;
            const cols = Object.keys(firstRow);
            const newFile: CSVFile = { id: `${Date.now()}-${file.name}`, name: file.name, headers: cols, rows: results.data as any[] };
            setFiles(prev => [...prev, newFile]);
            if (!selectedFileId) {
              setSelectedFileId(newFile.id);
              if (cols.length >= 2) { setXKey(cols[0]); setYKey(cols[1]); }
            }
            setError('');
          } else { setError(`文件 ${file.name} 无数据`); }
        },
        error: (err) => { setError(`解析 ${file.name} 失败: ${err.message}`); },
      });
    });
    e.target.value = '';
  };

  const switchFile = (fileId: string) => {
    setSelectedFileId(fileId);
    const file = files.find(f => f.id === fileId);
    if (file && file.headers.length >= 2) { setXKey(file.headers[0]); setYKey(file.headers[1]); }
    setChartOption(null);
    setAiReport('');
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      if (remaining.length > 0) {
        setSelectedFileId(remaining[0].id);
        setXKey(remaining[0].headers[0]);
        setYKey(remaining[0].headers[1]);
      } else { setSelectedFileId(null); setXKey(''); setYKey(''); }
      setChartOption(null);
      setAiReport('');
    }
  };

  const clearAll = () => {
    setFiles([]); setSelectedFileId(null); setXKey(''); setYKey('');
    setChartOption(null); setAiReport(''); setError('');
    localStorage.removeItem('dashboard-state');
  };

  // 生成图表核心逻辑（支持四种类型）
  const generateChartCore = useCallback(() => {
    if (!rows.length || !xKey || !yKey) { setError('请先上传文件并选择 X/Y 轴'); return null; }
    const xAxisData: string[] = [];
    const seriesData: number[] = [];
    for (const row of rows) {
      const xVal = String(row[xKey] ?? '');
      const yVal = parseFloat(row[yKey]);
      if (isNaN(yVal)) continue;
      xAxisData.push(xVal);
      seriesData.push(yVal);
    }
    if (seriesData.length === 0) { setError(`Y 轴列“${yKey}”没有有效数字`); return null; }

    if (chartType === 'pie') {
      return {
        title: { text: `${yKey} 分布图`, left: 'center' },
        tooltip: { trigger: 'item' },
        series: [{
          name: yKey,
          type: 'pie',
          radius: '50%',
          data: xAxisData.map((name, idx) => ({ name, value: seriesData[idx] })),
        }],
      };
    } else if (chartType === 'scatter') {
      return {
        title: { text: `${yKey} 分布图`, left: 'center' },
        xAxis: { type: 'category', name: xKey },
        yAxis: { type: 'value', name: yKey },
        series: [{
          type: 'scatter',
          data: seriesData.map((y, idx) => [idx, y]),
          symbolSize: 10,
        }],
      };
    } else {
      // bar / line
      return {
        title: { text: `${yKey} 分布图`, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: xAxisData, name: xKey, axisLabel: { interval: 0, rotate: 30 } },
        yAxis: { type: 'value', name: yKey },
        series: [{
          name: yKey,
          type: chartType === 'bar' ? 'bar' : 'line',
          data: seriesData,
          itemStyle: { borderRadius: [4,4,0,0], color: 'skyblue' },
          lineStyle: { color: 'skyblue', width: 2 },
          smooth: true,
        }],
      };
    }
  }, [rows, xKey, yKey, chartType]);

  // 防抖生成图表
  const debouncedGenerateChart = useMemo(() => debounce(() => {
    const opt = generateChartCore();
    if (opt) setChartOption(opt);
  }, 300), [generateChartCore]);

  const handleGenerateChart = () => {
    debouncedGenerateChart();
    setAiReport('');
  };

  // AI 报告（使用全量统计数据）
  const generateAIReport = async () => {
    if (!rows.length || !xKey || !yKey) { setError('请先上传文件并选择 X/Y 轴'); return; }
    if (!stats) { setError('无法计算统计数据'); return; }
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: currentFile?.name,
          headers,
          xKey,
          yKey,
          chartType,
          stats: {
            行数: stats.count,
            总和: stats.sum.toFixed(2),
            平均值: stats.avg.toFixed(2),
            中位数: stats.median.toFixed(2),
            最大值: stats.max,
            最小值: stats.min,
          },
          sampleRows: rows.slice(0, 3),
        }),
      });
      const data = await res.json();
      if (data.report) setAiReport(data.report);
      else setError('AI 报告返回内容无效');
    } catch (err) { setError('请求 AI 报告失败'); }
    finally { setIsGeneratingReport(false); }
  };

  // 导出图表为图片（使用 ref）
  const exportChartAsImage = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.getEchartsInstance().renderToCanvas();
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = canvas.toDataURL();
      link.click();
    } else {
      setError('图表未加载');
    }
  };

  // 决定是否使用虚拟滚动（>200 行）
  const useVirtualScroll = rows.length > 100;

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl">
        {/* 头部标题 */}
        <div className="text-center mb-8">
          <h1 className="title-gradient">
            📊 CSV 数据仪表盘
          </h1>
          <p className="subtitle">
            上传多个 CSV 文件，自由探索数据与智能分析
          </p>
        </div>

        {/* 操作栏 */}
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-3">
              <label className="btn-primary cursor-pointer">
                <span>📂</span> 上传 CSV（多选）
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {files.length > 0 && (
                <button onClick={clearAll} className="btn-secondary">
                  🗑️ 清空所有
                </button>
              )}
            </div>
            {files.length > 0 && (
              <div className="text-sm text-gray-500">
                已加载 {files.length} 个文件
              </div>
            )}
          </div>
        </div>

        {/* 文件标签列表 */}
        {files.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`file-tag ${selectedFileId === file.id ? 'file-tag-active' : 'file-tag-inactive'}`}
                onClick={() => switchFile(file.id)}
              >
                <span>📄</span>
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="file-remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 控制面板（X/Y选择、图表类型、生成按钮） */}
        {currentFile && (
          <div className="white-card mb-6">
            <div className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <span>📁</span> 当前文件：<span className="text-blue-600">{currentFile.name}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {chartType !== 'pie' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📌 X 轴列</label>
                    <select value={xKey} onChange={(e) => setXKey(e.target.value)} className="form-select">
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📈 Y 轴数值列</label>
                    <select value={yKey} onChange={(e) => setYKey(e.target.value)} className="form-select">
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </>
              ) : (
            <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  🥧 饼图将使用 X 轴列作为分类，Y 轴数值作为大小。
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">📊 图表类型</label>
                <div className="flex flex-wrap gap-2">
                  {(['bar', 'line', 'pie', 'scatter'] as ChartType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-1 rounded-xl text-sm transition-all ${
                        chartType === type
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'bar' && '📊 柱状图'}
                      {type === 'line' && '📈 折线图'}
                      {type === 'pie' && '🥧 饼图'}
                      {type === 'scatter' && '✨ 散点图'}
                    </button>
                  ))}
                </div>
                <button onClick={handleGenerateChart} className="btn-green mt-2">
                  ✨ 生成图表
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && <div className="error-alert">⚠️ {error}</div>}

        {/* 图表区域 */}
        {chartOption && (
          <div className="chart-container">
            <ReactECharts ref={chartRef} option={chartOption} style={{ height: 400 }} />
          </div>
        )}

        {/* AI 报告卡片 */}
        {aiReport && (
          <div className="ai-report-card">
            <h3 className="text-xl font-semibold text-indigo-800 flex items-center gap-2 mb-3">
              🤖 AI 数据分析报告（全量数据）
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiReport}</p>
          </div>
        )}

        {/* 导出工具栏 */}
        <div className="flex flex-wrap gap-3 mb-4 justify-end">
          {chartOption && (
            <button onClick={exportChartAsImage} className="btn-secondary text-sm">
              📸 导出图表为 PNG
            </button>
          )}
        </div>

        {/* 数据表格 - 根据行数选择渲染方式 */}
        {rows.length > 0 && (
          <div className="data-table-wrapper">
            {useVirtualScroll ? (
              <DataTableVirtual headers={headers} rows={rows} rowHeight={50} height={500} />
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <Table className="min-w-full">
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow className="border-b">
                      {headers.map((header) => (
                        <TableHead key={header} className="table-header-cell">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx} className="table-body-row">
                        {headers.map((header) => (
                          <TableCell key={header} className="table-body-cell">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={generateAIReport} disabled={isGeneratingReport} className="btn-indigo">
                {isGeneratingReport ? '🤔 AI 分析中...' : '✨ 生成 AI 报告（全量数据）'}
              </button>
            </div>
          </div>
        )}

        {files.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-text">暂无数据，请上传 CSV 文件开始探索</div>
            <div className="empty-hint">支持多选，一次上传多个文件</div>
          </div>
        )}
      </div>
    </div>
  );
}