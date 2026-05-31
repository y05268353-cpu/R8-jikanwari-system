/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 教員情報の型定義
 */
export interface Teacher {
  id: string;
  name: string;
  shortName: string;
  subject: string;
}

/**
 * 時間割テンプレートセルの型定義
 * 
 * - type: 'number' = R8マトリクス番号（1〜54番）
 * - type: 'text' = 固定テキスト（道徳、体育祭など）
 * - type: 'empty' = 空きコマ
 * - type: 'diagonal' = 斜め線パターン（使用不可を示す）
 */
export interface TimetableTemplateCell {
  week: 1 | 2;
  day: '月' | '火' | '水' | '木' | '金';
  period: number; // 1〜6
  type: 'number' | 'text' | 'empty' | 'diagonal';
  value: string; // 番号、テキスト、または空文字列
  rowSpan?: number; // 縦結合の行数（デフォルト: 1）
  customBgColor?: string; // カスタム背景色（16進数カラーコード）
  customTextColor?: string; // カスタム文字色（16進数カラーコード）
}

/**
 * 日次タイムラインの型定義
 * 給食の有無、A/B日程、下校目安などを管理
 */
export interface DayTimelineInfo {
  week: 1 | 2;
  day: '月' | '火' | '水' | '木' | '金';
  date: string; // 日付文字列 (例: "5/25", "6/1")
  lunch: boolean; // 給食の有無
  scheduleType: 'A' | 'B'; // A日程 or B日程
  endText: string; // 下校目安 (例: "A 14:45", "B 15:35頃")
  memo?: string; // メモ・注記
}

/**
 * R8時間割マトリクス行の型定義
 * 各行番号（1〜54）に対して、教員とクラスの割り当てを管理
 */
export interface TimetableMatrixRow {
  rowNumber: number; // 1〜54
  allocations: {
    [teacherId: string]: string; // teacherId -> allocatedClass (例: "個別", "1-2", "1-3")
  };
}

/**
 * 解決済み授業情報の型定義
 * resolveLesson関数の戻り値
 */
export interface ResolvedLesson {
  plainText: string; // 全テキスト
  subject: string; // 教科名
  teachersText: string; // 先生名テキスト
  isResolved: boolean; // 解決できたか
}

/**
 * マスターデータ編集用の型定義
 */
export interface MasterDataRow {
  id: string;
  rowNumber: number;
  subject: string;
  teachers: string[]; // 教員IDのリスト
  allocations: {
    [teacherId: string]: string;
  };
}

/**
 * テンプレート設定の型定義
 */
export interface TemplateSettings {
  targetClass: string; // 対象クラス (例: "個別", "1-2")
  weekCount: number; // 週数 (通常: 2)
}
