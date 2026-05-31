/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Teacher, TimetableTemplateCell, DayTimelineInfo, TimetableMatrixRow } from '../types';
import { resolveLesson } from '../utils/scheduler';
import { CheckCircle, Clock, Settings, Sparkles, Slash } from 'lucide-react';
import { getWeekDateRangeAndHeaders } from './TemplateEditor';

interface TimetablePreviewProps {
  targetClass: string;
  teachers: Teacher[];
  templateCells: TimetableTemplateCell[];
  dayTimelines: DayTimelineInfo[];
  matrixRows: TimetableMatrixRow[];
  onUpdateTemplateCells?: (cells: TimetableTemplateCell[]) => void;
  onUpdateDayTimelines?: (timelines: DayTimelineInfo[]) => void;
}

export default function TimetablePreview({
  targetClass,
  teachers,
  templateCells,
  dayTimelines,
  matrixRows,
  onUpdateTemplateCells,
  onUpdateDayTimelines,
}: TimetablePreviewProps) {
  const days: ('月' | '火' | '水' | '木' | '金')[] = ['月', '火', '水', '木', '金'];

  // クイック詳細編集用のステート
  const [editingCell, setEditingCell] = useState<TimetableTemplateCell | null>(null);
  const [editType, setEditType] = useState<'number' | 'text' | 'empty' | 'diagonal'>('number');
  const [editValue, setEditValue] = useState<string>('');
  const [editRowSpan, setEditRowSpan] = useState<number>(1);
  const [editBgColor, setEditBgColor] = useState<string>('');
  const [editTextColor, setEditTextColor] = useState<string>('');

  // 日常日程情報（日付・給食・下校目安）の編集用ステート
  const [editingTimeline, setEditingTimeline] = useState<DayTimelineInfo | null>(null);

  // 特定の日の特定時限のセルを取得
  const getCell = (week: 1 | 2, day: '月' | '火' | '水' | '木' | '金', period: number) => {
    return templateCells.find(c => c.week === week && c.day === day && c.period === period);
  };

  // 特定のコマが別のコマの結合（縦スパン）によって隠されているかをチェック
  const isCoveredByRowSpan = (week: 1 | 2, day: '月' | '火' | '水' | '木' | '金', period: number) => {
    for (let p = 1; p < period; p++) {
      const prevCell = getCell(week, day, p);
      if (prevCell && prevCell.rowSpan && prevCell.rowSpan > 1) {
        if (p + prevCell.rowSpan > period) {
          return true;
        }
      }
    }
    return false;
  };

  // セルのクイック編集モーダルを開く
  const openCellEdit = (cell: TimetableTemplateCell) => {
    if (!onUpdateTemplateCells) return;
    setEditingCell(cell);
    setEditType(cell.type);
    setEditValue(cell.value || '');
    setEditRowSpan(cell.rowSpan || 1);
    setEditBgColor(cell.customBgColor || '');
    setEditTextColor(cell.customTextColor || '');
  };

  // モーダル編集セルの保存処理
  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell || !onUpdateTemplateCells) return;

    const exists = templateCells.some(
      c => c.week === editingCell.week && c.day === editingCell.day && c.period === editingCell.period
    );
    let updatedCells;
    const rowSpanValue = editRowSpan > 1 ? editRowSpan : undefined;
    const customBgValue = editBgColor || undefined;
    const customTextValue = editTextColor || undefined;

    if (exists) {
      updatedCells = templateCells.map(c => {
        if (c.week === editingCell.week && c.day === editingCell.day && c.period === editingCell.period) {
          return {
            ...c,
            type: editType,
            value: editType === 'empty' || editType === 'diagonal' ? '' : editValue,
            rowSpan: rowSpanValue,
            customBgColor: customBgValue,
            customTextColor: customTextValue,
          };
        }
        return c;
      });
    } else {
      updatedCells = [
        ...templateCells,
        {
          week: editingCell.week,
          day: editingCell.day,
          period: editingCell.period,
          type: editType,
          value: editType === 'empty' || editType === 'diagonal' ? '' : editValue,
          rowSpan: rowSpanValue,
          customBgColor: customBgValue,
          customTextColor: customTextValue,
        },
      ];
    }

    onUpdateTemplateCells(updatedCells);
    setEditingCell(null);
  };

  // 日程情報の保存
  const handleSaveTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimeline || !onUpdateDayTimelines) return;

    const updated = dayTimelines.map(t =>
      t.week === editingTimeline.week && t.day === editingTimeline.day ? editingTimeline : t
    );

    onUpdateDayTimelines(updated);
    setEditingTimeline(null);
  };

  const getNumberOptionLabel = (num: number) => {
    const resolvedOption = resolveLesson(num, targetClass, teachers, matrixRows);
    if (resolvedOption.isResolved) {
      return `${num}番：${resolvedOption.subject} (${resolvedOption.teachersText})`;
    } else {
      // 現在の選択クラスではない場合、他クラスの割り当て状況を探す
      const row = matrixRows.find(r => r.rowNumber === num);
      if (row) {
        const otherAllocs: string[] = [];
        Object.entries(row.allocations).forEach(([teacherId, allocatedClass]) => {
          if (allocatedClass) {
            const t = teachers.find(teach => teach.id === teacherId);
            if (t) {
              otherAllocs.push(`${t.shortName}T(${allocatedClass})`);
            }
          }
        });
        if (otherAllocs.length > 0) {
          return `${num}番：[他クラス] ${otherAllocs.join(', ')}`;
        }
      }
      return `${num}番：(割り当てなし・空きコマ等)`;
    }
  };

  // 入力直接反映 & 自動判別ロジック
  const handleCellInputChange = (
    week: 1 | 2,
    day: '月' | '火' | '水' | '木' | '金',
    period: number,
    newValue: string
  ) => {
    if (!onUpdateTemplateCells) return;

    let type: 'number' | 'text' | 'empty' = 'number';
    const trimmed = newValue.trim();

    if (trimmed === '') {
      type = 'empty';
    } else if (isNaN(Number(trimmed))) {
      type = 'text';
    } else {
      type = 'number';
    }

    const exists = templateCells.some(c => c.week === week && c.day === day && c.period === period);
    let updatedCells;

    if (exists) {
      updatedCells = templateCells.map(c => {
        if (c.week === week && c.day === day && c.period === period) {
          return {
            ...c,
            type,
            value: newValue,
          };
        }
        return c;
      });
    } else {
      updatedCells = [
        ...templateCells,
        {
          week,
          day,
          period,
          type,
          value: newValue,
        },
      ];
    }

    onUpdateTemplateCells(updatedCells);
  };

  // セルの背景・ボーダースタイル自動計算
  const getCellStyles = (cell: TimetableTemplateCell | undefined) => {
    if (!cell || cell.type === 'empty') {
      return {
        bgColor: 'bg-slate-50/15',
        borderColor: 'border-slate-200/40'
      };
    }

    // 斜め線パターン
    if (cell.type === 'diagonal') {
      return {
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        hasDiagonal: true
      };
    }

    if (cell.type === 'text') {
      let bgColor = 'bg-sky-50/20';
      let borderColor = 'border-slate-200/50';
      const text = cell.value;
      
      if (text.includes('体育祭')) {
        bgColor = 'bg-red-50/30';
        borderColor = 'border-red-100';
      } else if (text.includes('開港記念日')) {
        bgColor = 'bg-amber-50/35';
        borderColor = 'border-amber-100';
      } else if (text.includes('道徳') || text.includes('総合')) {
        bgColor = 'bg-emerald-50/30';
        borderColor = 'border-emerald-100/50';
      }
      return { bgColor, borderColor };
    }

    // 番号マスタ解決
    const rowNum = parseInt(cell.value, 10);
    const resolved = resolveLesson(rowNum, targetClass, teachers, matrixRows);

    if (!resolved.isResolved) {
      return {
        bgColor: 'bg-slate-50/20',
        borderColor: 'border-slate-200/30'
      };
    }

    return {
      bgColor: 'bg-white hover:bg-slate-50/30',
      borderColor: 'border-slate-100'
    };
  };

  // 動的解決された授業名、教員名等の描画
  const renderCellResolvedResult = (cell: TimetableTemplateCell | undefined) => {
    const textStyle = cell?.customTextColor ? { color: cell.customTextColor } : {};

    if (!cell || cell.type === 'empty') {
      return (
        <div className="text-slate-400 text-[10px] italic mt-1 font-medium select-none" style={textStyle}>
          空き
        </div>
      );
    }

    // 斜め線パターンの表示
    if (cell.type === 'diagonal') {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100" y2="100" stroke="#94a3b8" strokeWidth="2" />
          </svg>
          <span className="text-slate-400 text-[10px] font-medium select-none relative z-10">斜め</span>
        </div>
      );
    }

    if (cell.type === 'text') {
      return (
        <div className="mt-1 flex flex-col items-center justify-center">
          <span className={`text-[12px] font-bold leading-tight block w-full truncate px-1 select-none text-center ${cell.customTextColor ? '' : 'text-blue-600'}`} style={textStyle} title={cell.value}>
            {cell.value}
          </span>
        </div>
      );
    }

    const rowNum = parseInt(cell.value, 10);
    const resolved = resolveLesson(rowNum, targetClass, teachers, matrixRows);

    if (!resolved.isResolved) {
      const isNum = !isNaN(Number(cell.value)) && cell.value !== '';
      return (
        <div className="mt-1 flex flex-col items-center justify-center">
          <span className={`text-[12px] font-bold leading-tight block w-full truncate px-1 select-none text-center ${cell.customTextColor ? '' : 'text-slate-700'}`} style={textStyle} title={cell.value}>
            {isNum ? `${cell.value}番` : cell.value}
          </span>
        </div>
      );
    }

    return (
      <div className="mt-1 flex flex-col items-center justify-center">
        <span className={`text-[12px] font-extrabold leading-tight block w-full truncate px-1 ${cell.customTextColor ? '' : 'text-slate-800'}`} style={textStyle} title={resolved.subject}>
          {resolved.subject}
        </span>
        <span className={`text-[9.5px] font-medium leading-none mt-1 select-none block w-full truncate px-0.5 ${cell.customTextColor ? '' : 'text-slate-450'}`} style={cell.customTextColor ? { color: cell.customTextColor, opacity: 0.85 } : {}} title={resolved.teachersText}>
          {resolved.teachersText}
        </span>
      </div>
    );
  };

  return (
    <div className="printable-area-wrapper space-y-12">
      {/* 1週目・2週目を元の紙面のように丁寧にレンダリング */}
      {[1, 2].map((weekNo) => {
        const { titleDate, dateHeaders } = getWeekDateRangeAndHeaders(weekNo as 1 | 2, dayTimelines);

        return (
          <div 
            key={weekNo} 
            className={`bg-white rounded-xl border border-slate-200/60 shadow-xs p-6 overflow-hidden ${
              weekNo === 1 ? 'print-page-break mb-12 print:mb-0' : ''
            }`}
          >
            {/* 週タイトル */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs shadow-3xs">
                  {weekNo}
                </span>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  {weekNo}週目の時間割 <span className="text-xs font-normal text-slate-400 ml-2">({titleDate})</span>
                </h3>
              </div>
              <div className="bg-slate-50 w-auto px-2.5 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500">
                表示対象：{targetClass}組
              </div>
            </div>

            {/* 時間割ボード */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-[100px_repeat(5,1fr)] border border-slate-200/80 rounded-lg overflow-hidden bg-slate-100 gap-[1px]">
                {/* 1列目: 時限ラベル列 */}
                <div className="flex flex-col gap-[1px]">
                  {/* 左上ヘッダー */}
                  <div className="bg-slate-50/80 p-3 h-[52px] flex flex-col items-center justify-center text-xs font-bold text-slate-500 border-b border-slate-200/60 text-center select-none shrink-0">
                    <div>時限 / 曜日</div>
                    <div className="text-[9px] text-blue-500 font-bold mt-1 bg-blue-50/50 border border-blue-100/30 px-1 py-0.2 rounded-sm leading-none">番号直接入力!</div>
                  </div>

                  {/* 時限ラベル (1〜6限) */}
                  {Array.from({ length: 6 }, (_, pIdx) => {
                    const period = pIdx + 1;
                    return (
                      <div key={period} className="bg-slate-50 flex flex-col items-center justify-center h-[100px] text-slate-600 font-bold select-none shrink-0 border-b border-slate-200/20">
                        <span className="text-sm">{period}</span>
                        <span className="text-[9px] text-slate-400 font-normal mt-0.5">校時</span>
                      </div>
                    );
                  })}

                  {/* 下校目安ヘッダー */}
                  <div className="bg-slate-50/80 border-t border-slate-200/40 p-2 flex flex-col items-center justify-center font-bold text-slate-500 text-[10px] text-center uppercase tracking-wider select-none h-[58px] shrink-0">
                    <span>下校目安</span>
                  </div>
                </div>

                {/* 2〜6列目: 各曜日列 */}
                {days.map((day, dIdx) => (
                  <div key={day} className="flex flex-col gap-[1px]">
                    {/* 曜日日付ヘッダー */}
                    <div 
                      onClick={() => {
                        if (onUpdateDayTimelines) {
                          const tl = dayTimelines.find(t => t.week === weekNo && t.day === day);
                          if (tl) setEditingTimeline({ ...tl });
                        }
                      }}
                      className="bg-slate-50/80 p-3 h-[52px] text-center border-b border-slate-200/60 flex flex-col justify-center select-none shrink-0 cursor-pointer hover:bg-blue-50/50 transition-colors group relative"
                      title="クリックして日付・日程・給食を設定"
                    >
                      <div className="text-[10px] font-semibold tracking-wide text-slate-400 group-hover:text-blue-500">日付(曜日)</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5 group-hover:text-blue-600 flex items-center justify-center gap-1">
                        <span>{dateHeaders[dIdx]}</span>
                        <Settings className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* 各校時セル */}
                    {Array.from({ length: 6 }, (_, pIdx) => {
                      const period = pIdx + 1;

                      // 別の結合コマによってこの時限がカバーされている場合は何もレンダリングしない
                      if (isCoveredByRowSpan(weekNo as 1 | 2, day, period)) {
                        return null;
                      }

                      const cell = getCell(weekNo as 1 | 2, day, period);
                      const timeline = dayTimelines.find(t => t.week === weekNo && t.day === day);
                      const isA = timeline?.scheduleType === 'A';
                      const isB = timeline?.scheduleType === 'B';
                      const isOther = timeline?.scheduleType !== 'A' && timeline?.scheduleType !== 'B';

                      const showLunchInThisCell = timeline?.lunch && (
                        (isA && period === 3) ||
                        (isB && period === 4) ||
                        (isOther && period === 6)
                      );

                      // セルの背景・ボーダースタイル＆結合用CSSクラス
                      const { bgColor, borderColor, hasDiagonal } = getCellStyles(cell);
                      const activeCell = cell || { week: weekNo as 1 | 2, day, period, type: 'empty' as const, value: '' };
                      const spanClass = cell?.rowSpan && cell.rowSpan > 1 ? `row-span-${cell.rowSpan}` : '';
                      const cellHeight = 101 * (cell?.rowSpan || 1) - 1;

                      const divStyle: React.CSSProperties = { height: `${cellHeight}px` };
                      if (cell?.customBgColor) {
                        divStyle.backgroundColor = cell.customBgColor;
                      }

                      return (
                        <div
                          key={`${day}-${period}`}
                          id={`cell-${weekNo}-${day}-${period}`}
                          onClick={() => openCellEdit(activeCell)}
                          className={`
                            relative border ${borderColor} ${cell?.customBgColor ? '' : bgColor} flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all hover:shadow-md hover:border-slate-300 group
                            ${spanClass}
                          `}
                          style={divStyle}
                        >
                          {/* 斜め線パターンの描画 */}
                          {hasDiagonal && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line x1="0" y1="0" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
                            </svg>
                          )}

                          {/* セル内容 */}
                          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                            {renderCellResolvedResult(cell)}
                          </div>

                          {/* 給食アイコン */}
                          {showLunchInThisCell && (
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center text-[8px] font-bold text-amber-700 shadow-2xs">
                              給食あり
                            </div>
                          )}

                          {/* ホバー時の詳細編集ボタン */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCellEdit(activeCell);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center shadow-md hover:bg-blue-600"
                            title="詳細編集"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    {/* 下校目安セル */}
                    <div 
                      onClick={() => {
                        if (onUpdateDayTimelines) {
                          const tl = dayTimelines.find(t => t.week === weekNo && t.day === day);
                          if (tl) setEditingTimeline({ ...tl });
                        }
                      }}
                      className="bg-slate-50 border-t border-slate-200/40 p-2 flex flex-col items-center justify-center h-[58px] text-[9.5px] font-bold text-slate-600 text-center select-none shrink-0 cursor-pointer hover:bg-blue-50/50 transition-colors group relative"
                      title="クリックして下校目安・学活を編集"
                    >
                      <span className="group-hover:text-blue-600 whitespace-pre-wrap leading-tight">
                        {dayTimelines.find(t => t.week === weekNo && t.day === day)?.endText || ''}
                      </span>
                      <Settings className="w-3 h-3 text-slate-300 absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 備考欄 */}
            {(() => {
              const weekMemos = dayTimelines
                .filter(t => t.week === weekNo && t.memo && t.memo.trim() !== '')
                .map(t => ({ day: t.day, date: t.date, memo: t.memo.trim() }));

              if (weekMemos.length === 0) return null;

              return (
                <div className="mt-5 p-4 bg-red-50/20 border border-red-100/50 rounded-lg text-left">
                  <div className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-2 select-none">
                    <span className="w-1.5 h-3 bg-red-500 rounded-xs"></span>
                    <span>備考 / お知らせ</span>
                  </div>
                  <ul className="space-y-1.5">
                    {weekMemos.map((m, idx) => (
                      <li key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-1">
                        <span className="text-red-650 font-bold shrink-0">【{m.date ? `${m.date}(${m.day})` : `${m.day}曜日`}】</span>
                        <span className="whitespace-pre-wrap leading-relaxed text-slate-700">{m.memo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* 詳細編集モーダル */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-800">
              コマ編集：{editingCell.week}週目 {editingCell.day}曜日 {editingCell.period}限目
            </h4>

            <form onSubmit={handleSaveCell} className="space-y-4">
              {/* タイプ選択 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">コマのタイプ</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="number">R8番号（例：18番）</option>
                  <option value="text">テキスト（例：道徳）</option>
                  <option value="empty">空きコマ</option>
                  <option value="diagonal">斜め線（使用不可）</option>
                </select>
              </div>

              {/* 値入力 */}
              {editType !== 'empty' && editType !== 'diagonal' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    {editType === 'number' ? 'R8番号' : 'テキスト'}
                  </label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={editType === 'number' ? '例: 18' : '例: 道徳'}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* 結合行数 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">縦結合（行数）</label>
                <select
                  value={editRowSpan}
                  onChange={(e) => setEditRowSpan(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 6 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}行</option>
                  ))}
                </select>
              </div>

              {/* 背景色 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">背景色（カスタム）</label>
                <input
                  type="color"
                  value={editBgColor}
                  onChange={(e) => setEditBgColor(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                />
              </div>

              {/* 文字色 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">文字色（カスタム）</label>
                <input
                  type="color"
                  value={editTextColor}
                  onChange={(e) => setEditTextColor(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                />
              </div>

              {/* ボタン */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- モーダル: 給食・学活終了・備考の編集 --- */}
      {editingTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 text-left">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>日程の個別設定 ({editingTimeline.week}週目 {editingTimeline.day}曜日)</span>
            </h4>

            <form onSubmit={handleSaveTimeline} className="space-y-4">
              {/* 日付の入力 */}
              <div className="space-y-1">
                <label htmlFor="edit-timeline-date" className="block text-xs font-bold text-slate-600">
                  日付 (例: 5/25 や 6/1)
                </label>
                <input
                  id="edit-timeline-date"
                  type="text"
                  required
                  value={editingTimeline.date || ''}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, date: e.target.value })}
                  placeholder="5/25"
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* 給食 */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-150">
                <span className="text-xs font-bold text-slate-600">給食の有無</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingTimeline.lunch}
                    onChange={(e) => setEditingTimeline({ ...editingTimeline, lunch: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-600">{editingTimeline.lunch ? 'あり' : 'なし'}</span>
                </label>
              </div>

              {/* 日課日程タイプ */}
              <div className="p-3 bg-slate-50 rounded border border-slate-150 space-y-2">
                <label className="block text-xs font-bold text-slate-600">日課日程タイプ</label>
                <div role="radiogroup" aria-label="日課日程タイプを選択" className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'A', label: 'A日程 (3限後)' },
                    { value: 'B', label: 'B日程 (4限後)' },
                    { value: 'Other', label: '通常 (6限後)' },
                  ].map((opt) => {
                    const currentType = editingTimeline.scheduleType || 'A';
                    const isSelected = opt.value === 'Other' 
                      ? (currentType !== 'A' && currentType !== 'B') 
                      : currentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEditingTimeline({ 
                            ...editingTimeline, 
                            scheduleType: opt.value === 'Other' ? undefined as any : (opt.value as 'A' | 'B') 
                          });
                        }}
                        className={`py-1 px-1 text-[9.5px] font-bold rounded border text-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                            : 'border-slate-200 hover:bg-slate-100 bg-white text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 leading-tight">
                  ※日程タイプに応じて、給食が最適な校時位置（3限後または4限後等）に動的に配置されます。
                </p>
              </div>

              {/* 学活終了 */}
              <div className="space-y-1">
                <label htmlFor="edit-timeline-end-text" className="block text-xs font-bold text-slate-600">
                  下校目安時間 / 特記メモ (改行可)
                </label>
                <textarea
                  id="edit-timeline-end-text"
                  rows={2}
                  value={editingTimeline.endText}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, endText: e.target.value })}
                  placeholder="A 15:45&#10;(3年生は健康観察) など"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* 赤字備考メモ */}
              <div className="space-y-1">
                <label htmlFor="edit-timeline-memo" className="block text-xs font-bold text-slate-650">
                  備考・お知らせ (赤字注記としてテーブル下に表示されます)
                </label>
                <textarea
                  id="edit-timeline-memo"
                  rows={2}
                  value={editingTimeline.memo || ''}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, memo: e.target.value })}
                  placeholder="（※1）職員出張のため、給食後下校となります。など"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTimeline(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs hover:bg-slate-50 text-slate-600 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs"
                >
                  日程を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}