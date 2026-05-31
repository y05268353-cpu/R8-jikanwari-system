/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import { Teacher, TimetableTemplateCell, DayTimelineInfo, TimetableMatrixRow } from '../types';
import { resolveLesson } from './scheduler';

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

/**
 * Excelのセルに標準的なスタイルを適用するヘルパー
 */
function applyCellStyle(
  cell: ExcelJS.Cell,
  options: {
    bgColor?: string;
    fgColor?: string;
    bold?: boolean;
    size?: number;
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
    borderStyle?: ExcelJS.BorderStyle;
    borderColor?: string;
  }
) {
  const {
    bgColor,
    fgColor = '333333',
    bold = false,
    size = 10,
    horizontal = 'center',
    vertical = 'middle',
    wrapText = true,
    borderStyle = 'thin',
    borderColor = 'CCCCCC'
  } = options;

  // フォント設定
  cell.font = {
    name: 'BIZ UD Gothic',
    size,
    bold,
    color: { argb: fgColor.replace('#', '') }
  };

  // 背景色設定
  if (bgColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor.replace('#', '') }
    };
  } else {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF' }
    };
  }

  // 配置設定
  cell.alignment = {
    horizontal,
    vertical,
    wrapText
  };

  // 罫線設定
  if (borderStyle) {
    cell.border = {
      top: { style: borderStyle, color: { argb: borderColor.replace('#', '') } },
      left: { style: borderStyle, color: { argb: borderColor.replace('#', '') } },
      bottom: { style: borderStyle, color: { argb: borderColor.replace('#', '') } },
      right: { style: borderStyle, color: { argb: borderColor.replace('#', '') } }
    };
  }
}

/**
 * 2週間分の個別時間割を美しく整形されたExcelファイルとしてエクスポートする。
 */
export async function exportToExcel(
  targetClass: string,
  teachers: Teacher[],
  templateCells: TimetableTemplateCell[],
  dayTimelines: DayTimelineInfo[],
  matrixRows: TimetableMatrixRow[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${targetClass}組 時間割`);

  // グリッド線の表示を有効にする
  worksheet.views = [{ showGridLines: true }];

  // 列の幅を設定
  worksheet.columns = [
    { key: 'period', width: 12 }, // 時限
    { key: 'mon', width: 22 },    // 月
    { key: 'tue', width: 22 },    // 火
    { key: 'wed', width: 22 },    // 水
    { key: 'thu', width: 22 },    // 木
    { key: 'fri', width: 22 }     // 金
  ];

  // タイトル等で利用する日リスト
  const weekDays: ('月' | '火' | '水' | '木' | '金')[] = ['月', '火', '水', '木', '金'];

  // Helper: セルの色判定ロジック
  const getExportCellColor = (value: string, type: 'number' | 'text' | 'empty' | 'diagonal', cell?: TimetableTemplateCell) => {
    if (cell?.customBgColor || cell?.customTextColor) {
      const bg = cell.customBgColor ? cell.customBgColor.replace('#', '').toUpperCase() : 'FFFFFF';
      const fg = cell.customTextColor ? cell.customTextColor.replace('#', '').toUpperCase() : '1E293B';
      return { bg, fg };
    }

    if (type === 'diagonal') {
      return { bg: 'E2E8F0', fg: '64748B' }; // 斜め線用の薄いグレー
    }

    if (type === 'empty' || !value) {
      return { bg: 'FAFAFA', fg: '94A3B8' }; // 空きコマ等
    }

    if (type === 'text') {
      if (value.includes('体育祭') || value.includes('閉会式')) {
        return { bg: 'FEF2F2', fg: '991B1B' }; // 薄赤、赤文字
      }
      if (value.includes('開港記念日')) {
        return { bg: 'FFFBEB', fg: '92400E' }; // 薄アンバー、アンバー文字
      }
      if (value.includes('道徳') || value.includes('総合')) {
        return { bg: 'ECFDF5', fg: '065F46' }; // 薄緑、緑文字
      }
      return { bg: 'F0F9FF', fg: '0369A1' }; // その他テキスト：薄青
    }

    // 数値 (通常授業)
    return { bg: 'FFFFFF', fg: '1E293B' };
  };

  // ==========================================
  // WEEK 1 & WEEK 2 GENERATOR
  // ==========================================
  const buildWeekTable = (weekNo: 1 | 2, startRow: number) => {
    const { titleDate, dateHeaders } = getWeekDateRangeAndHeaders(weekNo, dayTimelines);

    // 1. 週見出し (スタート行)
    worksheet.mergeCells(startRow, 1, startRow, 6);
    const weekTitleCell = worksheet.getCell(startRow, 1);
    weekTitleCell.value = `【第${weekNo}週目】  期間: ${titleDate}`;
    applyCellStyle(weekTitleCell, {
      bgColor: 'EFF6FF', // Light Blue
      fgColor: '1E40AF',
      bold: true,
      size: 11,
      horizontal: 'left',
      borderStyle: 'thin',
      borderColor: 'BFDBFE'
    });
    worksheet.getRow(startRow).height = 24;

    // 2. 曜日日付ヘッダー (次の行)
    const headerRowIdx = startRow + 1;
    worksheet.getRow(headerRowIdx).height = 26;
    
    // 曜日ヘッダー左上
    const tlCornerCell = worksheet.getCell(headerRowIdx, 1);
    tlCornerCell.value = '時限 / 曜日';
    applyCellStyle(tlCornerCell, {
      bgColor: 'F1F5F9',
      fgColor: '475569',
      bold: true,
      size: 9,
      borderColor: 'CBD5E1'
    });

    dateHeaders.forEach((header, dIdx) => {
      const headerCell = worksheet.getCell(headerRowIdx, dIdx + 2);
      headerCell.value = header;
      applyCellStyle(headerCell, {
        bgColor: 'F1F5F9',
        fgColor: '1E293B',
        bold: true,
        size: 10,
        borderColor: 'CBD5E1'
      });
    });

    // 3. 1限〜6限 のコマ描画
    const timetableStartRow = headerRowIdx + 1;
    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const period = pIdx + 1;
      const rowIdx = timetableStartRow + pIdx;
      worksheet.getRow(rowIdx).height = 54; // 充分な高さを確保

      // 時限番号列
      const pCell = worksheet.getCell(rowIdx, 1);
      pCell.value = `${period}\n校時`;
      applyCellStyle(pCell, {
        bgColor: 'F8FAFC',
        fgColor: '475569',
        bold: true,
        size: 9,
        borderColor: 'CBD5E1'
      });

      // 各曜日を埋める
      weekDays.forEach((day, dIdx) => {
        const colIdx = dIdx + 2;
        const cellInfo = templateCells.find(c => c.week === weekNo && c.day === day && c.period === period);
        const timeline = dayTimelines.find(t => t.week === weekNo && t.day === day);

        const currentCell = worksheet.getCell(rowIdx, colIdx);

        // 手動でセルの値を構築
        let textVal = '';
        let cellType: 'number' | 'text' | 'empty' | 'diagonal' = 'empty';
        let rawVal = '';

        if (cellInfo) {
          rawVal = cellInfo.value;
          cellType = cellInfo.type;
        }

        if (cellType === 'diagonal') {
          textVal = '／';
        } else if (cellType === 'text') {
          textVal = rawVal;
        } else if (cellType === 'number') {
          const rowNum = parseInt(rawVal, 10);
          const resolved = resolveLesson(rowNum, targetClass, teachers, matrixRows);
          if (resolved.isResolved) {
            textVal = `${resolved.subject}\n${resolved.teachersText}`;
          } else {
            const isNum = !isNaN(Number(rawVal)) && rawVal !== '';
            textVal = isNum ? `未割当 (${rawVal}番)` : rawVal;
          }
        } else {
          textVal = '空き';
        }

        // inline給食判定
        const isA = timeline?.scheduleType === 'A';
        const isB = timeline?.scheduleType === 'B';
        const isOther = timeline?.scheduleType !== 'A' && timeline?.scheduleType !== 'B';

        const showLunch = timeline?.lunch && (
          (isA && period === 3) ||
          (isB && period === 4) ||
          (isOther && period === 6)
        );

        if (showLunch && cellType !== 'empty') {
          textVal += '\n【給食あり】';
        }

        currentCell.value = textVal;

        // 色付け
        const styleColors = getExportCellColor(rawVal || textVal, cellType, cellInfo);
        applyCellStyle(currentCell, {
          bgColor: styleColors.bg,
          fgColor: styleColors.fg,
          bold: cellType === 'text',
          size: 9.5,
          borderColor: 'CBD5E1'
        });
      });
    }

    // 4. 特別マージ(結合)ロジックの適用 (ユーザーが設定したセルのrowSpanに基づいてExcel上でも動的にセル結合を行う)
    templateCells.forEach(cell => {
      if (cell.week === weekNo && cell.rowSpan && cell.rowSpan > 1) {
        const dIdx = weekDays.indexOf(cell.day as any);
        if (dIdx !== -1) {
          const colIdx = dIdx + 2; // B(2)〜F(6)列
          const fromRow = timetableStartRow + (cell.period - 1);
          const toRow = Math.min(fromRow + (cell.rowSpan - 1), timetableStartRow + 5);

          if (toRow > fromRow) {
            try {
              // すべての対象範囲を結合
              worksheet.mergeCells(fromRow, colIdx, toRow, colIdx);

              // 結合起点セルのスタイルを再構成
              const mergedCell = worksheet.getCell(fromRow, colIdx);
              const styleColors = getExportCellColor(cell.value, cell.type, cell);
              applyCellStyle(mergedCell, {
                bgColor: styleColors.bg,
                fgColor: styleColors.fg,
                bold: cell.type === 'text',
                size: cell.type === 'text' ? 10 : 9.5,
                borderColor: 'CBD5E1'
              });
            } catch (mergeError) {
              console.warn('Excel cell merge failed:', mergeError);
            }
          }
        }
      }
    });

    // 5. 下校目安行
    const closingRowIdx = timetableStartRow + 6;
    worksheet.getRow(closingRowIdx).height = 36;
    
    const closingLabelCell = worksheet.getCell(closingRowIdx, 1);
    closingLabelCell.value = '下校目安';
    applyCellStyle(closingLabelCell, {
      bgColor: 'F1F5F9',
      fgColor: '475569',
      bold: true,
      size: 9,
      borderColor: 'CBD5E1'
    });

    weekDays.forEach((day, dIdx) => {
      const colIdx = dIdx + 2;
      const timeline = dayTimelines.find(t => t.week === weekNo && t.day === day);
      const cell = worksheet.getCell(closingRowIdx, colIdx);
      const isNoSchool = weekNo === 2 && day === '火';

      if (isNoSchool) {
        cell.value = 'ー';
        applyCellStyle(cell, {
          bgColor: 'FFFBEB',
          fgColor: '92400E',
          size: 9.5,
          borderColor: 'CBD5E1'
        });
      } else if (timeline?.endText) {
        cell.value = timeline.endText;
        applyCellStyle(cell, {
          bgColor: 'FFFFFF',
          fgColor: '1E293B',
          bold: true,
          size: 9,
          borderColor: 'CBD5E1'
        });
      } else {
        cell.value = '未設定';
        applyCellStyle(cell, {
          bgColor: 'FFFFFF',
          fgColor: '94A3B8',
          size: 9,
          borderColor: 'CBD5E1'
        });
      }
    });

    // 6. お知らせ・備考行
    const memoRowIdx = closingRowIdx + 1;
    worksheet.getRow(memoRowIdx).height = 42; // 十分な縦幅を確保

    worksheet.mergeCells(memoRowIdx, 1, memoRowIdx, 6);
    const memoCell = worksheet.getCell(memoRowIdx, 1);

    const hasMemo = dayTimelines.some(t => t.week === weekNo && t.memo);
    if (hasMemo) {
      const memoText = dayTimelines
        .filter(t => t.week === weekNo && t.memo)
        .map(t => `【${t.day}曜】${t.memo}`)
        .join(' ／ ');
      memoCell.value = `お知らせ・備考:  ${memoText}`;
      applyCellStyle(memoCell, {
        bgColor: 'FFF5F5', // 薄ピンク色
        fgColor: 'DC2626', // 赤文字
        bold: true,
        size: 9,
        horizontal: 'left',
        borderColor: 'FEE2E2'
      });
    } else {
      memoCell.value = 'お知らせ・備考:  特になし';
      applyCellStyle(memoCell, {
        bgColor: 'F9FAFB',
        fgColor: '6B7280',
        bold: false,
        size: 9,
        horizontal: 'left',
        borderColor: 'E5E7EB'
      });
    }
  };

  // 1週目を1行目から設定する
  buildWeekTable(1, 1);

  // 2週目を12行目から設定する（1週目は1+1(見出し)+1(曜日)+6(コマ)+1(下校)+1(メモ) = 11行）
  worksheet.getRow(11).height = 12; // 1週目と2週目の空きライン
  buildWeekTable(2, 12);

  // ==========================================
  // EXPORT PROCESS
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${targetClass}組_2週間時間割_R8同期.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * R8時間割マスタ全体をExcelシートとしてエクスポートする。
 */
export async function exportMasterToExcel(
  teachers: Teacher[],
  matrixRows: TimetableMatrixRow[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('R8時間割マスタ');

  worksheet.views = [{ showGridLines: true }];

  // 1. 列幅自動定義
  worksheet.columns = [
    { key: 'rowNumber', width: 8 },
    { key: 'subjectDummy', width: 6 },
    ...teachers.map(t => ({ key: `teacher_${t.id}`, width: 15 }))
  ];

  // 2. ヘッダー1: 教科
  const headerRow1 = worksheet.getRow(1);
  headerRow1.height = 24;
  
  const cellA1 = worksheet.getCell('A1');
  cellA1.value = '番号';
  applyCellStyle(cellA1, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 10, borderColor: '2563EB' });
  
  const cellB1 = worksheet.getCell('B1');
  cellB1.value = '教科';
  applyCellStyle(cellB1, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 10, borderColor: '2563EB' });

  teachers.forEach((t, index) => {
    const colIdx = index + 3;
    const cell = worksheet.getCell(1, colIdx);
    cell.value = t.subject;
    applyCellStyle(cell, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 9.5, borderColor: '2563EB' });
  });

  // 3. ヘッダー2: 氏名
  const headerRow2 = worksheet.getRow(2);
  headerRow2.height = 24;
  
  const cellA2 = worksheet.getCell('A2');
  cellA2.value = '番号';
  applyCellStyle(cellA2, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 10, borderColor: '2563EB' });
  
  const cellB2 = worksheet.getCell('B2');
  cellB2.value = '氏名';
  applyCellStyle(cellB2, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 10, borderColor: '2563EB' });

  teachers.forEach((t, index) => {
    const colIdx = index + 3;
    const cell = worksheet.getCell(2, colIdx);
    cell.value = t.name;
    applyCellStyle(cell, { bgColor: '3B82F6', fgColor: 'FFFFFF', bold: true, size: 9.5, borderColor: '2563EB' });
  });

  // A1:A2, B1:B2 の結合
  worksheet.mergeCells('A1:A2');
  worksheet.mergeCells('B1:B2');

  // 4. データ行 (1〜54番)
  matrixRows.forEach((row, rIdx) => {
    const curRowIdx = rIdx + 3;
    const curRow = worksheet.getRow(curRowIdx);
    curRow.height = 20;

    // 番号列
    const cellNum = worksheet.getCell(curRowIdx, 1);
    cellNum.value = row.rowNumber;
    applyCellStyle(cellNum, {
      bgColor: curRowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
      fgColor: '475569',
      bold: true,
      size: 9.5,
      borderColor: 'E2E8F0'
    });

    // 空きダミー
    const cellDummy = worksheet.getCell(curRowIdx, 2);
    cellDummy.value = '';
    applyCellStyle(cellDummy, {
      bgColor: curRowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
      borderColor: 'E2E8F0'
    });

    // 先生各々への割当
    teachers.forEach((t, tIdx) => {
      const colIdx = tIdx + 3;
      const cell = worksheet.getCell(curRowIdx, colIdx);
      const value = row.allocations[t.id] || '';
      cell.value = value;
      
      applyCellStyle(cell, {
        bgColor: value
          ? 'EFF6FF' // 割当あり = 薄い青
          : (curRowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF'),
        fgColor: value ? '1D4ED8' : '333333',
        bold: !!value,
        size: 9.5,
        borderColor: 'E2E8F0'
      });
    });
  });

  // EXPORT
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'R8時間割_マスタデータ.xlsx';
  anchor.click();
  window.URL.revokeObjectURL(url);
}
