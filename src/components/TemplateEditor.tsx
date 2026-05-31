/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TimetableTemplateCell, DayTimelineInfo } from '../types';
import { Edit3, CheckCircle, HelpCircle, Save, HelpCircle as HelpIcon, Sparkles } from 'lucide-react';

export const getWeekDateRangeAndHeaders = (weekNo: 1 | 2, timelines: DayTimelineInfo[]) => {
  const days: ('月' | '火' | '水' | '木' | '金')[] = ['月', '火', '水', '木', '金'];
  const defaultDatesWeek1 = ['5/25', '5/26', '5/27', '5/28', '5/29'];
  const defaultDatesWeek2 = ['6/1', '6/2', '6/3', '6/4', '6/5'];
  const defaultDates = weekNo === 1 ? defaultDatesWeek1 : defaultDatesWeek2;

  const datesFormatted = days.map((day, idx) => {
    const tl = timelines.find(t => t.week === weekNo && t.day === day);
    if (tl && tl.date) {
      return tl.date;
    }
    return defaultDates[idx];
  });

  const dateHeaders = datesFormatted.map((dt, idx) => {
    const dayName = days[idx];
    if (dt.includes('(') || dt.includes('曜')) {
      return dt;
    }
    return `${dt}(${dayName})`;
  });

  const firstDate = dateHeaders[0];
  const lastDate = dateHeaders[dateHeaders.length - 1];
  const titleDate = `${firstDate} 〜 ${lastDate}`;

  return { titleDate, dateHeaders };
};

interface TemplateEditorProps {
  templateCells: TimetableTemplateCell[];
  dayTimelines: DayTimelineInfo[];
  onUpdateTemplateCells: (cells: TimetableTemplateCell[]) => void;
  onUpdateDayTimelines: (timelines: DayTimelineInfo[]) => void;
}

export default function TemplateEditor({
  templateCells,
  dayTimelines,
  onUpdateTemplateCells,
  onUpdateDayTimelines,
}: TemplateEditorProps) {
  const days: ('月' | '火' | '水' | '木' | '金')[] = ['月', '火', '水', '木', '金'];
  
  // 編集ダイアログ用ステート
  const [editingCell, setEditingCell] = useState<TimetableTemplateCell | null>(null);
  const [editType, setEditType] = useState<'number' | 'text' | 'empty'>('number');
  const [editValue, setEditValue] = useState('');
  const [editRowSpan, setEditRowSpan] = useState<number>(1);
  const [editBgColor, setEditBgColor] = useState<string>('');
  const [editTextColor, setEditTextColor] = useState<string>('');

  // 日付、給食、学活終了の直接変更
  const [editingTimeline, setEditingTimeline] = useState<DayTimelineInfo | null>(null);

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

  // セル編集モーダルを開く
  const openCellEdit = (cell: TimetableTemplateCell) => {
    setEditingCell(cell);
    setEditType(cell.type);
    setEditValue(cell.value);
    setEditRowSpan(cell.rowSpan || 1);
    setEditBgColor(cell.customBgColor || '');
    setEditTextColor(cell.customTextColor || '');
  };

  // セルの変更を保存
  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;

    const rowSpanValue = editRowSpan > 1 ? editRowSpan : undefined;
    const customBgValue = editBgColor || undefined;
    const customTextValue = editTextColor || undefined;

    const updated = templateCells.map(c => {
      if (c.week === editingCell.week && c.day === editingCell.day && c.period === editingCell.period) {
        return {
          ...c,
          type: editType,
          value: editType === 'empty' ? '' : editValue,
          rowSpan: rowSpanValue,
          customBgColor: customBgValue,
          customTextColor: customTextValue,
        };
      }
      return c;
    });

    onUpdateTemplateCells(updated);
    setEditingCell(null);
  };

  // 日次設定（給食や学活時刻）を保存
  const handleSaveTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimeline) return;

    const updated = dayTimelines.map(t => 
      t.week === editingTimeline.week && t.day === editingTimeline.day ? editingTimeline : t
    );

    onUpdateDayTimelines(updated);
    setEditingTimeline(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-xs p-6 space-y-8">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-500" />
          時間割雛形 (テンプレート) 設定
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          日々の時間割に入力されている「番号」や「特別活動テキスト（体育祭など）」を変更します。クリックすると個別設定ダイアログが開きます。
        </p>
      </div>

      {/* 2週間をそれぞれ編集用カード */}
      {[1, 2].map(weekNo => {
        const { dateHeaders } = getWeekDateRangeAndHeaders(weekNo as 1 | 2, dayTimelines);

        return (
          <div key={weekNo} className="space-y-4 border-l-2 border-blue-400 pl-4">
            <h4 className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded inline-block">
              {weekNo}週目の雛形
            </h4>

            <div className="overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-6 border border-slate-200 rounded-lg overflow-hidden bg-slate-100 gap-[1px]">
                {/* 左上ヘッダ */}
                <div className="bg-slate-50/80 p-3 flex items-center justify-center text-[10px] font-semibold text-slate-400 uppercase">
                  時限 \ 曜日
                </div>

                {/* 曜日 */}
                {days.map((day, dIdx) => (
                  <div key={day} className="bg-slate-50/80 p-2 text-center flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-slate-800">{dateHeaders[dIdx]}</span>
                    <button
                      onClick={() => {
                        const tl = dayTimelines.find(t => t.week === weekNo && t.day === day);
                        if (tl) setEditingTimeline({ ...tl });
                      }}
                      className="mt-1 text-[9px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      給食/学活を編集
                    </button>
                  </div>
                ))}

                {/* 1限〜6限 */}
                {Array.from({ length: 6 }, (_, pIdx) => {
                  const period = pIdx + 1;
                  return (
                    <React.Fragment key={period}>
                      <div className="bg-slate-50 py-3.5 text-center text-xs font-bold text-slate-500 flex items-center justify-center">
                        {period}限
                      </div>

                      {days.map(day => {
                        if (isCoveredByRowSpan(weekNo as 1 | 2, day, period)) {
                          return null;
                        }
                        const cell = getCell(weekNo as 1 | 2, day, period);
                        if (!cell) return <div key={day} className="bg-white"></div>;

                        const span = cell.rowSpan || 1;
                        const spanClass = span > 1 ? `row-span-${span}` : '';
                        
                        // 高さを結合数に合わせてスケール
                        const heightStyle = span > 1 
                          ? { minHeight: `${50 * span + (span - 1)}px` } 
                          : undefined;

                        const customStyles: React.CSSProperties = {
                          ...heightStyle,
                        };
                        if (cell.customBgColor) {
                          customStyles.backgroundColor = cell.customBgColor;
                        }
                        if (cell.customTextColor) {
                          customStyles.color = cell.customTextColor;
                        }

                        let styleClass = 'hover:border-blue-400 bg-white hover:bg-slate-50 cursor-pointer';
                        let displayText = '';

                        if (cell.type === 'empty') {
                          displayText = '空';
                          if (!cell.customTextColor) styleClass += ' text-slate-300 italic text-[10px]';
                        } else if (cell.type === 'text') {
                          displayText = cell.value.replace('\n', ' ');
                          if (!cell.customBgColor) styleClass += ' bg-amber-50/30 hover:bg-amber-100/10';
                          if (!cell.customTextColor) styleClass += ' text-amber-700 font-bold';
                        } else {
                          displayText = `${cell.value}番`;
                          if (!cell.customBgColor) styleClass += ' bg-blue-50/30';
                          if (!cell.customTextColor) styleClass += ' text-blue-600 font-bold text-xs';
                        }

                        if (span > 1) {
                          displayText += ` (${span}コマ結合)`;
                        }

                        return (
                          <div
                            key={day}
                            onClick={() => openCellEdit(cell)}
                            style={customStyles}
                            className={`p-3 flex flex-col justify-center items-center border border-slate-200/20 text-center text-xs transition-all relative ${spanClass} ${styleClass}`}
                            title="クリックして編集"
                          >
                            <span className="line-clamp-2" style={cell.customTextColor ? { color: cell.customTextColor } : {}}>{displayText}</span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* --- モーダル: セル編集 --- */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>コマ編集 ({editingCell.week}週目 {editingCell.day}曜 {editingCell.period}限)</span>
            </h4>
            
            <form onSubmit={handleSaveCell} className="space-y-4">
              {/* タイプ選択 */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5">セルの種類</label>
                <div role="radiogroup" aria-label="セルの種類を選択" className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'number', label: 'R8時間割番号' },
                    { type: 'text', label: '特別活動/固定文' },
                    { type: 'empty', label: '非表示/空き' },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setEditType(opt.type as any);
                        if (opt.type === 'number' && isNaN(Number(editValue))) {
                          setEditValue('1');
                        }
                      }}
                      className={`py-1.5 px-1.5 text-[10px] font-semibold rounded border text-center transition-colors ${
                        editType === opt.type
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 値の入力 */}
              {editType === 'number' && (
                <div>
                  <label htmlFor="edit-value-select" className="block text-[10px] font-bold text-slate-500 mb-1">R8時間割の番号 (1〜54)</label>
                  <select
                    id="edit-value-select"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white"
                  >
                    {Array.from({ length: 54 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={`${num}`}>{num}番</option>
                    ))}
                  </select>
                </div>
              )}

              {editType === 'text' && (
                <div>
                  <label htmlFor="edit-value-textarea" className="block text-[10px] font-bold text-slate-500 mb-1">表示用テキスト (改行可能)</label>
                  <textarea
                    id="edit-value-textarea"
                    required
                    rows={2}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="体育祭&#10;閉会式 など"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {editType === 'empty' && (
                <div className="p-3 bg-slate-50 rounded text-xs text-slate-500">
                  この時間は表示されず、空白領域になります。
                </div>
              )}

              {/* コマの結合設定 (1コマ〜6コマ) */}
              <div>
                <label htmlFor="modal-edit-rowspan" className="block text-[10px] font-bold text-slate-500 mb-1">
                  コマの結合（縦方向に繋ぐ設定）
                </label>
                <select
                  id="modal-edit-rowspan"
                  value={editRowSpan}
                  onChange={(e) => setEditRowSpan(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium cursor-pointer animate-fade-in"
                >
                  <option value={1}>結合しない (1コマ)</option>
                  <option value={2}>2コマ分結合する (次のコマと結合)</option>
                  <option value={3}>3コマ分結合する (合計3コマ)</option>
                  <option value={4}>4コマ分結合する (合計4コマ)</option>
                  <option value={5}>5コマ分結合する (合計5コマ)</option>
                  <option value={6}>6コマ分（終日）結合する</option>
                </select>
              </div>

              {/* 背景色・文字色指定（自由選択） */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  カスタム表示色 (背景色と文字色)
                </label>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-250/50">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">背景色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editBgColor || '#ffffff'}
                        onChange={(e) => setEditBgColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={editBgColor}
                        onChange={(e) => setEditBgColor(e.target.value)}
                        className="w-full text-[10px] uppercase font-mono px-1.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">文字色</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editTextColor || '#000000'}
                        onChange={(e) => setEditTextColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={editTextColor}
                        onChange={(e) => setEditTextColor(e.target.value)}
                        className="w-full text-[10px] uppercase font-mono px-1.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
                
                {/* プリセット選択 */}
                <div className="mt-2.5 space-y-1">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">よく使うプリセット:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'デフォルト', bg: '', text: '' },
                      { name: '体育祭(赤系)', bg: '#FEF2F2', text: '#991B1B' },
                      { name: '開港記念日(橙系)', bg: '#FFFBEB', text: '#92400E' },
                      { name: '道徳・総合(緑系)', bg: '#ECFDF5', text: '#065F46' },
                      { name: '特別(青系)', bg: '#F0F9FF', text: '#0369A1' },
                      { name: '補習(紫系)', bg: '#FAF5FF', text: '#6B21A8' },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditBgColor(p.bg);
                          setEditTextColor(p.text);
                        }}
                        className="px-1.5 py-0.5 rounded border border-slate-200/60 bg-white text-[8.5px] font-bold text-slate-600 hover:border-slate-300 active:scale-95 transition-all cursor-pointer shadow-3xs"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 保存/キャンセル */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs hover:bg-slate-50 text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                >
                  設定を適用
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- モーダル: 給食・学活終了・備考の編集 --- */}
      {editingTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">
              日程情報の個別設定 ({editingTimeline.week}週目 {editingTimeline.day}曜日)
            </h4>

            <form onSubmit={handleSaveTimeline} className="space-y-4">
              {/* 日付の入力 */}
              <div>
                <label htmlFor="edit-timeline-date" className="block text-xs font-bold text-slate-600 mb-1">
                  日付 (例: 5/25 や 6/1)
                </label>
                <input
                  id="edit-timeline-date"
                  type="text"
                  value={editingTimeline.date || ''}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, date: e.target.value })}
                  placeholder="5/25"
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded text-xs text-slate-800 font-medium"
                />
              </div>

              {/* 給食 */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                <span className="text-xs font-bold text-slate-600">給食の有無</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingTimeline.lunch}
                    onChange={(e) => setEditingTimeline({ ...editingTimeline, lunch: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-600">{editingTimeline.lunch ? 'あり' : 'なし'}</span>
                </label>
              </div>

              {/* 日課日程タイプ */}
              <div className="p-3 bg-slate-50 rounded border border-slate-100/80 space-y-2">
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
                            scheduleType: opt.value === 'Other' ? undefined : (opt.value as 'A' | 'B') 
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
                  ※日程変更に応じて、給食行が自動的に3限後(A)か4限後(B)の一番最適な位置に動いて描画されます。
                </p>
              </div>

              {/* 学活終了 */}
              <div>
                <label htmlFor="edit-timeline-end-text" className="block text-[10px] font-bold text-slate-500 mb-1">
                  学活終了・下校目安時間 (改行して注記等も可)
                </label>
                <textarea
                  id="edit-timeline-end-text"
                  rows={2}
                  value={editingTimeline.endText}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, endText: e.target.value })}
                  placeholder="A 15:45&#10;(3年生は健康観察) など"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>

              {/* 赤字備考メモ */}
              <div>
                <label htmlFor="edit-timeline-memo" className="block text-[10px] font-bold text-slate-500 mb-1">
                  備考・お知らせ (赤字注記としてテーブル下に表示されます)
                </label>
                <textarea
                  id="edit-timeline-memo"
                  rows={2}
                  value={editingTimeline.memo || ''}
                  onChange={(e) => setEditingTimeline({ ...editingTimeline, memo: e.target.value })}
                  placeholder="（※1）職員出張のため、給食を食べて下校となります。など"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                />
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTimeline(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs hover:bg-slate-50 text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                >
                  日程を更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
