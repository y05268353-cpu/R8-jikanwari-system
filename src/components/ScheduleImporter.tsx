/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { TimetableTemplateCell } from '../types';
import { Upload, Sparkles, RefreshCw, CheckCircle2, AlertCircle, FileText, ArrowRight, CalendarRange } from 'lucide-react';

interface ParsedDay {
  date: string;
  day: string;
  periods: string[];
  scheduleType?: 'A' | 'B';
  lunch?: boolean;
  endText?: string;
  memo?: string;
}

interface ScheduleImporterProps {
  templateCells: TimetableTemplateCell[];
  onUpdateTemplateCells: (cells: TimetableTemplateCell[]) => void;
  dayTimelines: any[]; // DayTimelineInfo[]
  onUpdateDayTimelines: (timelines: any[]) => void;
}

/**
 * 日付を年度ベース（4月1日～3月31日）で正規化する関数
 * @param dateStr 日付文字列 (例: "4/13", "6/2", "3/31")
 * @returns 年度内での順序キー (例: 1, 64, 365)
 */
const normalizeDateToAcademicYear = (dateStr: string): number => {
  const [month, day] = dateStr.split('/').map(Number);
  
  // 4月～12月は、そのまま日数に変換
  // 1月～3月は、前年度の4月からの累積日数として計算
  if (month >= 4) {
    // 4月1日が1、5月1日が31、...
    const daysInMonths = [0, 31, 30, 31, 30, 31, 31, 30, 31, 30]; // 4月～12月の日数
    let totalDays = day;
    for (let m = 4; m < month; m++) {
      totalDays += daysInMonths[m - 3];
    }
    return totalDays;
  } else {
    // 1月～3月は、前年度の4月からの累積
    // 4月～12月: 31+30+31+30+31+31+30+31+30 = 275日
    const daysUntilDec = 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30; // 275
    const daysInJanToMar = [0, 31, 28, 31]; // 1月～3月の日数
    let totalDays = daysUntilDec;
    for (let m = 1; m < month; m++) {
      totalDays += daysInJanToMar[m];
    }
    totalDays += day;
    return totalDays;
  }
};

export default function ScheduleImporter({
  templateCells,
  onUpdateTemplateCells,
  dayTimelines,
  onUpdateDayTimelines,
}: ScheduleImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedWeeks, setParsedWeeks] = useState<{ id: number; label: string; days: ParsedDay[] }[]>([]);
  const [successWeekMessage, setSuccessWeekMessage] = useState<string | null>(null);
  const [selectedDateOption, setSelectedDateOption] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ドラッグ＆ドロップ用
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // ファイルをBase64に変換してサーバーに送信
  const handleParseFile = async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    setSuccessWeekMessage(null);
    setSelectedDateOption(null);

    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || getMimeTypeFromExtension(selectedFile.name);

      const response = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: mimeType,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `解析サーバーエラー (${response.status})`);
      }

      const data: ParsedDay[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('行事予定表から有効な時間割予定データを読み取れませんでした。ファイル内容が錦台中学校の行事予定表か確認してください。');
      }

      // 週ごとにグループ化するロジック（年度ベース日付順序で固定）
      const grouped = groupDaysIntoWeeks(data);
      setParsedWeeks(grouped);
      if (grouped.length > 0) {
        setSelectedDateOption(grouped[0].label);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ファイルの解析中にエラーが発生しました。時間を置いて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // 補助関数: Base64エンコード
  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  };

  // 拡張子から暫定MIMEタイプを取得
  const getMimeTypeFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return 'application/octet-stream';
  };

  // 抽出された日程リストを、月曜始まりの「週」ごとにグルーピング
  // 年度ベース（4月1日～3月31日）で日付を固定化
  const groupDaysIntoWeeks = (days: ParsedDay[]) => {
    // 稼働日のみ、かつ曜日が「月・火・水・木・金」のものを集計
    const targetDays = ['月', '火', '水', '木', '金'];
    const validDays = days.map(d => {
      const normalizedDay = d.day ? d.day.replace('曜日', '').replace('曜', '').trim() : '';
      return { ...d, day: normalizedDay };
    }).filter(d => targetDays.includes(d.day) && d.periods && Array.isArray(d.periods));

    // 年度ベース日付でソート（4月1日が最初、3月31日が最後）
    validDays.sort((a, b) => {
      const aOrder = normalizeDateToAcademicYear(a.date);
      const bOrder = normalizeDateToAcademicYear(b.date);
      return aOrder - bOrder;
    });

    const weeksList: { id: number; label: string; days: ParsedDay[] }[] = [];
    let currentWeekDays: ParsedDay[] = [];
    let weekId = 1;

    for (let i = 0; i < validDays.length; i++) {
      const d = validDays[i];
      currentWeekDays.push(d);

      // 金曜日、あるいは次の要素が月曜日、または最後の要素の時にグループを締め切る
      const isFriday = d.day === '金';
      const isLast = i === validDays.length - 1;
      const nextIsMonday = !isLast && validDays[i + 1].day === '月';

      if (isFriday || isLast || nextIsMonday) {
        if (currentWeekDays.length > 0) {
          // 週のラベルを作成 (例: "4/13 (月) 〜 4/17 (金)")
          const start = currentWeekDays[0];
          const end = currentWeekDays[currentWeekDays.length - 1];
          const label = `${start.date}(${start.day}) 〜 ${end.date}(${end.day})`;

          weeksList.push({
            id: weekId++,
            label,
            days: [...currentWeekDays],
          });
          currentWeekDays = [];
        }
      }
    }

    return weeksList;
  };

  // ファイル選択ハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      handleParseFile(selected);
    }
  };

  // ドラッグ＆ドロップハンドラー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      setFile(selected);
      handleParseFile(selected);
    }
  };

  // 抽出された特定週の時間割を「1週目」または「2週目」に流し込み
  // 日付を dayTimelines に同期
  const handleApplyToWeek = (targetWeekNo: 1 | 2, weekDays: ParsedDay[]) => {
    if (!onUpdateTemplateCells || !onUpdateDayTimelines) return;

    let updatedCells = [...templateCells];
    let updatedTimelines = [...dayTimelines];
    const daysAllowed: ('月' | '火' | '水' | '木' | '金')[] = ['月', '火', '水', '木', '金'];

    weekDays.forEach(dayData => {
      const dayName = (dayData.day ? dayData.day.replace('曜日', '').replace('曜', '').trim() : '') as '月' | '火' | '水' | '木' | '金';
      if (!daysAllowed.includes(dayName)) return;

      // 1. 各授業（1限〜6限）をマッピング
      dayData.periods.forEach((val, idx) => {
        const period = idx + 1;
        const trimmedVal = val ? val.trim() : '';

        let type: 'number' | 'text' | 'empty' = 'number';
        if (trimmedVal === '' || trimmedVal === '/' || trimmedVal === '×') {
          type = 'empty';
        } else if (isNaN(Number(trimmedVal))) {
          type = 'text';
        } else {
          type = 'number';
        }

        const cellIndex = updatedCells.findIndex(
          c => c.week === targetWeekNo && c.day === dayName && c.period === period
        );

        const newCellValue = type === 'empty' ? '' : trimmedVal;

        if (cellIndex !== -1) {
          updatedCells[cellIndex] = {
            ...updatedCells[cellIndex],
            type,
            value: newCellValue,
            rowSpan: undefined, // インポート時は結合を解除
          };
        } else {
          updatedCells.push({
            week: targetWeekNo,
            day: dayName,
            period,
            type,
            value: newCellValue,
            rowSpan: undefined,
          });
        }
      });

      // 2. 日次フッター情報（給食、A/B日程、下校目安、メモ）をマッピング
      const timelineIndex = updatedTimelines.findIndex(
        t => t.week === targetWeekNo && t.day === dayName
      );

      // A日程/B日程の自動判定ロジック補強：
      let sType: 'A' | 'B' = 'A';
      if (dayData.scheduleType === 'A' || dayData.scheduleType === 'B') {
        sType = dayData.scheduleType;
      } else if (dayData.endText) {
        const trimmedEnd = dayData.endText.trim();
        if (trimmedEnd.startsWith('A') || trimmedEnd.startsWith('a')) {
          sType = 'A';
        } else if (trimmedEnd.startsWith('B') || trimmedEnd.startsWith('b')) {
          sType = 'B';
        }
      }

      const isNoSchool = dayData.periods.every(p => p === '開港記念日' || p === '休' || p === '');
      const isLunch = isNoSchool ? false : (dayData.lunch !== undefined ? dayData.lunch : true);

      const computedEndText = dayData.periods.some(p => p === '開港記念日')
        ? ''
        : dayData.endText || (sType === 'A' ? 'A 15:45' : 'B 15:35頃');

      const timelineData = {
        week: targetWeekNo,
        day: dayName,
        date: dayData.date, // 日付を同期
        lunch: isLunch,
        scheduleType: sType,
        endText: computedEndText,
        memo: dayData.memo || undefined,
      };

      if (timelineIndex !== -1) {
        updatedTimelines[timelineIndex] = {
          ...updatedTimelines[timelineIndex],
          ...timelineData,
        };
      } else {
        updatedTimelines.push(timelineData);
      }
    });

    onUpdateTemplateCells(updatedCells);
    onUpdateDayTimelines(updatedTimelines);
    setSuccessWeekMessage(`選択した行事予定の週データを【第 ${targetWeekNo} 週目】に適用しました！(日付、日程A/B、給食、下校目安を同期しました。)`);
    
    // スムーズなスクロールでプレビュー本体へ案内
    setTimeout(() => {
      const boardElement = document.getElementById(`cell-${targetWeekNo}-月-1`);
      if (boardElement) {
        boardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 450);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-xs p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 leading-none">
            <Sparkles className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
            <span>月次行事予定表の自動インポート (PDF・画像対応)</span>
          </h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            毎月配られる「行事予定表」をアップロードするだけで、AIが曜日と校時(R8番号や特別授業)を自動解読。2週間時間割にそのまま流し込むことができます。日付は年度ベース（4月1日～3月31日）で自動整列されます。
          </p>
        </div>
        {parsedWeeks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setParsedWeeks([]);
              setError(null);
              setSuccessWeekMessage(null);
              setSelectedDateOption(null);
            }}
            className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 py-1 px-2.5 rounded border border-slate-200 transition-colors"
          >
            リセット
          </button>
        )}
      </div>

      {/* ファイルアップロードドラッグエリア */}
      {parsedWeeks.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/20'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,image/png,image/jpeg,image/jpg"
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-700 block">AIが予定表を解読しています...</span>
                <span className="text-[10px] text-slate-400 block max-w-xs leading-relaxed">
                  添付されたPDFまたは紙面画像から、日付、曜日、および各時限(1〜6校時)のR8コマ番号・行事名などを高精度に抽出しています。10〜15秒ほどお待ちください。
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shadow-3xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-center space-y-0.5">
                <span className="text-xs font-bold text-slate-700 block">行事予定ファイルをここにドラッグ＆ドロップ</span>
                <span className="text-[10px] text-slate-400 block">または、クリックしてファイルを選択</span>
              </div>
              <div className="text-[9px] text-slate-400 bg-slate-150 py-0.5 px-2 rounded-full mt-2 font-medium">
                対応形式：PDF、PNG、JPEG（錦台中学校の配布プリント対応）
              </div>
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3.5 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2.5 text-xs text-red-700 text-left animate-fade-in animate-shake">
          <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">認識エラー</span>
            <p className="leading-relaxed text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* 適用成功メッセージ */}
      {successWeekMessage && (
        <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800 text-left animate-fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">適用完了</span>
            <p className="leading-relaxed text-emerald-700">{successWeekMessage}</p>
          </div>
        </div>
      )}

      {/* 解析済み週の選択UI */}
      {parsedWeeks.length > 0 && (
        <div className="space-y-3">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
            <span className="text-xs font-bold text-slate-705 block mb-2.5">
              <CalendarRange className="w-4 h-4 inline mr-1 text-blue-500" />
              解析された週を選択・プレビュー
            </span>
            <div className="space-y-3">
              {parsedWeeks.map((week) => (
                <div key={week.id} className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-slate-200/60 shadow-3xs">
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedDateOption(week.label)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg border transition-all text-xs font-bold ${
                        selectedDateOption === week.label
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-3xs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      {week.label} {selectedDateOption === week.label ? ' (表示中)' : ''}
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplyToWeek(1, week.days)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-3xs active:scale-95"
                      >
                        1週目に適用
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyToWeek(2, week.days)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-3xs active:scale-95"
                      >
                        2週目に適用
                      </button>
                    </div>
                  </div>

                  {/* この週の詳細プレビュー (選択されている場合に表示) */}
                  {selectedDateOption === week.label && (
                    <div className="border-t border-slate-100 pt-3">
                      <div className="text-[11px] font-bold text-slate-500 mb-2.5 flex items-center gap-1 leading-none">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>読込中の時間割プレビュー：</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 overflow-x-auto pb-1">
                        {['月', '火', '水', '木', '金'].map((dayName) => {
                          const dayData = week.days.find(
                            d => d.day === dayName || d.day.replace('曜日', '').trim() === dayName
                          );
                          return (
                            <div key={dayName} className="flex flex-col gap-1 bg-slate-50/50 p-2 rounded-md border border-slate-200/60 min-w-[95px] text-center">
                              {/* 曜日日付ヘッダー */}
                              <div className="bg-white p-1 rounded-sm text-center border border-slate-250">
                                <span className="text-[10px] font-bold text-slate-700 block whitespace-nowrap">
                                  {dayData ? `${dayData.date}(${dayName})` : `${dayName}`}
                                </span>
                              </div>

                              {/* 1〜6限の各コマ */}
                              {Array.from({ length: 6 }).map((_, pIdx) => {
                                const period = pIdx + 1;
                                const periodVal = dayData && dayData.periods && dayData.periods[pIdx] ? dayData.periods[pIdx].trim() : '';
                                
                                return (
                                  <div 
                                    key={period} 
                                    className={`h-[38px] flex flex-col items-center justify-center border rounded text-[10.5px] p-0.5 font-bold leading-tight ${
                                      periodVal ? 'bg-blue-50/20 border-blue-100 text-blue-900' : 'bg-slate-100/40 border-slate-150 text-slate-400'
                                    }`}
                                  >
                                    <span className="text-[8px] text-slate-400 block scale-85 leading-none mb-0.5">{period}限</span>
                                    <span className="truncate max-w-full block font-extrabold text-[10px]">
                                      {periodVal || '—'}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* 給食 */}
                              <div className="bg-amber-50/70 border border-amber-100 p-0.5 rounded flex items-center justify-center h-[20px] select-none">
                                {dayData && dayData.lunch !== false ? (
                                  <span className="text-[9px] font-extrabold text-amber-700">給食あり</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-450">給食なし</span>
                                )}
                              </div>

                              {/* 下校目安 */}
                              <div className="bg-white border border-slate-150 p-0.5 rounded flex items-center justify-center h-[20px]">
                                <span className="text-[9px] font-extrabold text-slate-600 truncate max-w-full block" title={dayData?.endText || ''}>
                                  {dayData?.endText || '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}