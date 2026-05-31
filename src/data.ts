/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, TimetableTemplateCell, DayTimelineInfo, TimetableMatrixRow } from './types';

// 初期教員データ（R8時間割の列ヘッダーに対応）
export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't1', name: '松本 優希', shortName: '松本', subject: '数学' },
  { id: 't2', name: '山内 隆介', shortName: '山内', subject: '理科' },
  { id: 't3', name: '吉本 百花', shortName: '吉本', subject: '国語' },
  { id: 't4', name: '服部 祐芽', shortName: '服部', subject: '英語' },
  { id: 't5', name: '鶴田 航平', shortName: '鶴田', subject: '保体' },
  { id: 't6', name: '宮國 杏菜', shortName: '宮國', subject: '英語' },
  { id: 't7', name: '藤野 斐子', shortName: '藤野', subject: '国語' },
  { id: 't8', name: '藤田 貴弘', shortName: '藤田', subject: '社会' },
  { id: 't9', name: '渡邉 佳奈子', shortName: '渡邉', subject: '音楽' },
  { id: 't10', name: '神保 夏子', shortName: '神保', subject: '美術' },
  { id: 't11', name: '塚本 名都子', shortName: '塚本', subject: '英語' },
  { id: 't12', name: '後藤 正志', shortName: '後藤', subject: '音楽' },
  { id: 't13', name: '佐藤 健太', shortName: '佐藤', subject: '社会' },
  { id: 't14', name: '大川 文', shortName: '大川', subject: '英語' },
  { id: 't15', name: '出口 頌基', shortName: '出口', subject: '保体' },
  { id: 't16', name: '寺尾 俊裕', shortName: '寺尾', subject: '数学' },
  { id: 't17', name: '菊永 育美', shortName: '菊永', subject: '数学' },
  { id: 't18', name: '岩村 真実', shortName: '岩村', subject: '国語' },
  { id: 't19', name: '福田 洋平', shortName: '福田', subject: '理科' },
  { id: 't20', name: '野井 加奈子', shortName: '野井', subject: '保体' },
  { id: 't21', name: '岡崎 恒哉', shortName: '岡崎', subject: '数学' },
  { id: 't22', name: '小國 晃平', shortName: '小國', subject: '数学' },
  { id: 't23', name: '髙柳 愛', shortName: '髙柳', subject: '英語' },
  { id: 't24', name: '濱崎 瑞紀', shortName: '濱崎', subject: '社会' },
  { id: 't25', name: '北村 竜良', shortName: '北村', subject: '理科' },
  { id: 't26', name: '石母田 丈', shortName: '石母田', subject: '国語' },
  { id: 't27', name: '近田 珠璃', shortName: '近田', subject: '家庭科' },
  { id: 't28', name: '砂川 慎太郎', shortName: '砂川', subject: '数学' },
  { id: 't29', name: '村田 楓佳', shortName: '村田', subject: '理科' },
  { id: 't30', name: '永井 奈実', shortName: '永井', subject: '英語' },
  { id: 't31', name: '菅沼 彩香', shortName: '菅沼', subject: '保体' },
  { id: 't32', name: '大森 好明', shortName: '大森', subject: '技術' },
  { id: 't33', name: '藤江 健', shortName: '藤江', subject: '社会' },
  { id: 't34', name: 'カレン', shortName: 'カレン', subject: 'AET' },
  { id: 't35', name: '岡林 克彦', shortName: '岡林', subject: '保体' },
  { id: 't36', name: '栄田 恵美', shortName: '栄田', subject: '美術' },
  
  // 個別時間割の「7組担任」「菊井T」「渡邊T」を補足・解決するための追加または仮想教員
  { id: 't_7g', name: '7組 担任', shortName: '7組担任', subject: '自立' },
  { id: 't_kikui', name: '菊井 先生', shortName: '菊井', subject: '英語' },
  { id: 't_watanabe', name: '渡邊 先生', shortName: '渡邊', subject: '自立' },
];

// 2週間分の個別時間割・初期雛形データ (各コマの「番号」または「固定テキスト」)
export const INITIAL_TEMPLATE_CELLS: TimetableTemplateCell[] = [
  // === 1週目 (25月〜29金) ===
  // 25日(月)
  { week: 1, day: '月', period: 1, type: 'text', value: '道徳\n(交流・各学年)' },
  { week: 1, day: '月', period: 2, type: 'number', value: '18' }, // 美術 (神保T)
  { week: 1, day: '月', period: 3, type: 'number', value: '19' }, // 自立・体育 (7組担任)
  { week: 1, day: '月', period: 4, type: 'number', value: '20' }, // 自立 (7組担任)
  { week: 1, day: '月', period: 5, type: 'number', value: '21' }, // 自立 (渡邊T)
  { week: 1, day: '月', period: 6, type: 'empty', value: '' },

  // 26日(火)
  { week: 1, day: '火', period: 1, type: 'number', value: '23' }, // 作業・家庭科 (7組担任)
  { week: 1, day: '火', period: 2, type: 'number', value: '25' }, // 自立 (7組担任)
  { week: 1, day: '火', period: 3, type: 'number', value: '26' }, // 自立・体育 (7組担任)
  { week: 1, day: '火', period: 4, type: 'text', value: '(※1)' }, // 職員出張のため給食後下校
  { week: 1, day: '火', period: 5, type: 'empty', value: '' },
  { week: 1, day: '火', period: 6, type: 'empty', value: '' },

  // 27日(水)
  { week: 1, day: '水', period: 1, type: 'number', value: '1' }, // 保健体育 (野井T)
  { week: 1, day: '水', period: 2, type: 'number', value: '2' }, // 美術 (神保T)
  { week: 1, day: '水', period: 3, type: 'number', value: '3' }, // 自立・読書 (7組担任)
  { week: 1, day: '水', period: 4, type: 'number', value: '5' }, // 自立 (7組担任)
  { week: 1, day: '水', period: 5, type: 'number', value: '6' }, // 数学 (7組担任)
  { week: 1, day: '水', period: 6, type: 'text', value: '学活\n(交流・各学年)' },

  // 28日(木)
  { week: 1, day: '木', period: 1, type: 'number', value: '1' }, // 保健体育 (野井T)
  { week: 1, day: '木', period: 2, type: 'number', value: '2' }, // 美術 (神保T)
  { week: 1, day: '木', period: 3, type: 'number', value: '4' }, // 自立・読書 (7組担任)
  { week: 1, day: '木', period: 4, type: 'text', value: '29 自立(1年)\n総合(2,3年)' }, // 29 自立(1年)/総合(2,3年)
  { week: 1, day: '木', period: 5, type: 'text', value: '体育祭予行' },
  { week: 1, day: '木', period: 6, type: 'text', value: '体育祭予行' },

  // 29日(金)
  { week: 1, day: '金', period: 1, type: 'number', value: '10' }, // 国語 (岩村T)
  { week: 1, day: '金', period: 2, type: 'number', value: '12' }, // 理科 (北村T)
  { week: 1, day: '金', period: 3, type: 'number', value: '13' }, // 英語 (菊井T)
  { week: 1, day: '金', period: 4, type: 'text', value: '総合\n(交流・各学年)' },
  { week: 1, day: '金', period: 5, type: 'text', value: '体育祭準備' },
  { week: 1, day: '金', period: 6, type: 'text', value: '体育祭準備' },

  // === 2週目 (6/1月〜6/5金) ===
  // 1日(月)
  { week: 2, day: '月', period: 1, type: 'text', value: '体育祭代休' },
  { week: 2, day: '月', period: 2, type: 'text', value: '体育祭代休' },
  { week: 2, day: '月', period: 3, type: 'text', value: '体育祭代休' },
  { week: 2, day: '月', period: 4, type: 'text', value: '閉会式' },
  { week: 2, day: '月', period: 5, type: 'text', value: '振り返り・片付け' },
  { week: 2, day: '月', period: 6, type: 'empty', value: '' },

  // 2日(火)
  { week: 2, day: '火', period: 1, type: 'text', value: '開港記念日' },
  { week: 2, day: '火', period: 2, type: 'text', value: '開港記念日' },
  { week: 2, day: '火', period: 3, type: 'text', value: '開港記念日' },
  { week: 2, day: '火', period: 4, type: 'text', value: '開港記念日' },
  { week: 2, day: '火', period: 5, type: 'text', value: '開港記念日' },
  { week: 2, day: '火', period: 6, type: 'text', value: '開港記念日' },

  // 3日(水)
  { week: 2, day: '水', period: 1, type: 'text', value: '道徳\n(交流・各学年)' },
  { week: 2, day: '水', period: 2, type: 'number', value: '14' }, // 音楽 (後藤T)
  { week: 2, day: '水', period: 3, type: 'number', value: '15' }, // 自立・掃除 (7組担任)
  { week: 2, day: '水', period: 4, type: 'number', value: '16' }, // 国語 (7組担任)
  { week: 2, day: '水', period: 5, type: 'number', value: '17' }, // 保健体育 (野井T)
  { week: 2, day: '水', period: 6, type: 'number', value: '18' }, // 美術 (神保T)

  // 4日(木)
  { week: 2, day: '木', period: 1, type: 'number', value: '19' }, // 自立・体育 (7組担任)
  { week: 2, day: '木', period: 2, type: 'number', value: '20' }, // 数学 (岡崎T・菊永T)
  { week: 2, day: '木', period: 3, type: 'number', value: '21' }, // 自立 (渡邊T)
  { week: 2, day: '木', period: 4, type: 'number', value: '22' }, // 国語 (7組担任)
  { week: 2, day: '木', period: 5, type: 'number', value: '24' }, // 作業・家庭科 (7組担任)
  { week: 2, day: '木', period: 6, type: 'number', value: '25' }, // 作業・技術 (7組担任)

  // 5日(金)
  { week: 2, day: '金', period: 1, type: 'text', value: '総合\n(交流・各学年)' },
  { week: 2, day: '金', period: 2, type: 'number', value: '26' }, // 英語 (菊井T)
  { week: 2, day: '金', period: 3, type: 'number', value: '27' }, // 社会 (藤江T)
  { week: 2, day: '金', period: 4, type: 'number', value: '28' }, // 英語・音楽 (渡邊T)
  { week: 2, day: '金', period: 5, type: 'number', value: '1' }, // 保健体育 (野井T)
  { week: 2, day: '金', period: 6, type: 'text', value: '29 自立(1年)\n総合(2,3年)' }, // 29 自立(1年)/総合(2,3年)
];

// 日次フッター情報 (給食有無, 学活終了時間など)
export const INITIAL_DAY_TIMELINES: DayTimelineInfo[] = [
  // 1週目
  { week: 1, day: '月', date: '5/25', lunch: true, endText: 'A 14:45\n(3年生は健康観察)', scheduleType: 'A' },
  { week: 1, day: '火', date: '5/26', lunch: true, endText: 'A 12:40\n(3年生は健康観察)', scheduleType: 'A', memo: '（※1）職員出張のため、26日（火）は給食を食べて下校となります。' },
  { week: 1, day: '水', date: '5/27', lunch: true, endText: 'A 15:50', scheduleType: 'A' },
  { week: 1, day: '木', date: '5/28', lunch: true, endText: 'B 15:35頃', scheduleType: 'B' },
  { week: 1, day: '金', date: '5/29', lunch: true, endText: 'B 12:35', scheduleType: 'B' },
  // 2週目
  { week: 2, day: '月', date: '6/1', lunch: false, endText: 'B 15:00頃', scheduleType: 'B' },
  { week: 2, day: '火', date: '6/2', lunch: false, endText: '', scheduleType: 'A' }, // 祝日・記念日
  { week: 2, day: '水', date: '6/3', lunch: true, endText: 'A 15:45', scheduleType: 'A' },
  { week: 2, day: '木', date: '6/4', lunch: true, endText: 'A 15:45', scheduleType: 'A' },
  { week: 2, day: '金', date: '6/5', lunch: true, endText: 'A 15:45', scheduleType: 'A' },
];

/**
 * 初期マトリクス割当データ (R8時間割、1〜54番)
 * OCRから「個別」に対応する教員の担当枠をマッピング。
 * これが「マスタデータ」となり、ユーザーは自由に追加・変更できます。
 */
export const INITIAL_MATRIX_ROWS: TimetableMatrixRow[] = [
  { rowNumber: 1, allocations: { 't20': '個別', 't21': '個別', 't1': '1-2', 't3': '1-1', 't4': '1-3', 't5': '1-56' } },
  { rowNumber: 2, allocations: { 't9': '個別', 't1': '1-3', 't2': '1-6', 't3': '1-4', 't5': '1-12' } },
  { rowNumber: 3, allocations: { 't_7g': '個別', 't1': '1-6', 't5': '1-34' } },
  { rowNumber: 4, allocations: { 't_7g': '個別', 't1': '1-6', 't5': '1-34' } },
  { rowNumber: 5, allocations: { 't_7g': '個別', 't1': '1-5', 't2': '1-2', 't3': '1-3', 't4': '1-4' } },
  { rowNumber: 6, allocations: { 't_7g': '個別', 't1': '1-4', 't3': '1-3', 't5': '1-3' } },
  { rowNumber: 7, allocations: { 't_7g': '個別', 't2': '1-2', 't3': '1-5', 't4': '1-5', 't5': '1-2' } },
  { rowNumber: 8, allocations: { 't8': '個別', 't_7g': '個別', 't1': '1-2', 't2': '1-5', 't3': '1-1', 't4': '3-123', 't5': '1-6' } },
  { rowNumber: 9, allocations: { 't19': '個別', 't_7g': '個別', 't1': '1-3', 't2': '1-6', 't3': '2-1', 't4': '1-1', 't5': '3-456' } },
  { rowNumber: 10, allocations: { 't15': '個別', 't_7g': '個別', 't1': '1-6', 't3': '1-2', 't5': '1-2' } },
  { rowNumber: 11, allocations: { 't23': '個別', 't_7g': '個別', 't2': '1-3', 't3': '1-2', 't4': '1-56', 't5': '2-5' } },
  { rowNumber: 12, allocations: { 't23': '個別', 't_7g': '個別', 't2': '1-3', 't3': '1-2', 't4': '1-56', 't5': '2-5' } },
  { rowNumber: 13, allocations: { 't_7g': '個別', 't2': '1-3', 't3': '2-2', 't4': '1-4', 't5': '1-12' } },
  { rowNumber: 14, allocations: { 't10': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-1', 't3': '1-2', 't4': '1-3' } },
  { rowNumber: 15, allocations: { 't_7g': '個別', 't1': '1-2', 't2': '1-5', 't3': '1-1', 't4': '1-6' } },
  { rowNumber: 16, allocations: { 't14': '個別', 't_7g': '個別', 't1': '1-3', 't2': '1-2', 't3': '1-5', 't5': '1-5' } },
  { rowNumber: 17, allocations: { 't19': '個別', 't_7g': '個別', 't1': '1-6', 't2': '2-3', 't3': '1-2', 't4': '3-123' } },
  { rowNumber: 18, allocations: { 't10': '個別', 't_7g': '個別', 't2': '1-4', 't3': '1-3', 't4': '1-1', 't5': '3-456' } },
  { rowNumber: 19, allocations: { 't_7g': '個別', 't1': '1-3', 't3': '1-12', 't4': '1-4', 't5': '1-5' } },
  { rowNumber: 20, allocations: { 't16': '個別', 't20': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-6', 't4': '1-34' } },
  { rowNumber: 21, allocations: { 't7': '個別', 't_7g': '個別', 't1': '1-4', 't2': '1-1', 't3': '1-2', 't4': '1-56' } },
  { rowNumber: 22, allocations: { 't_7g': '個別', 't1': '1-2', 't2': '1-6', 't3': '1-1', 't4': '1-3' } },
  { rowNumber: 23, allocations: { 't_7g': '個別', 't1': '1-1', 't2': '1-5', 't4': '1-2' } },
  { rowNumber: 24, allocations: { 't_7g': '個別', 't1': '1-1', 't2': '1-5', 't4': '1-2' } },
  { rowNumber: 25, allocations: { 't_7g': '個別', 't1': '1-3', 't2': '1-2', 't4': '1-6' } },
  { rowNumber: 26, allocations: { 't_7g': '個別', 't1': '1-6', 't2': '1-3', 't3': '1-1', 't4': '3-123' } },
  { rowNumber: 27, allocations: { 't31': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-3', 't3': '1-4', 't4': '3-456' } },
  { rowNumber: 28, allocations: { 't7': '個別', 't_7g': '個別', 't2': '1-4', 't3': '1-5', 't4': '1-1', 't5': '1-6' } },
  { rowNumber: 29, allocations: { 't_7g': '個別', 't1': '1-1', 't2': '1-2', 't3': '1-5' } },
  { rowNumber: 30, allocations: { 't9': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-3', 't3': '1-2', 't4': '3-123' } },
  { rowNumber: 31, allocations: { 't12': '個別', 't_7g': '個別', 't1': '1-1', 't3': '1-2', 't4': '1-4', 't5': '3-456' } },
  { rowNumber: 32, allocations: { 't_7g': '個別', 't1': '1-3', 't2': '1-2', 't3': '2-3' } },
  { rowNumber: 33, allocations: { 't9': '個別', 't_7g': '個別', 't1': '1-2', 't2': '1-4', 't3': '1-1' } },
  { rowNumber: 34, allocations: { 't19': '個別', 't_7g': '個別', 't1': '1-6', 't2': '1-3', 't3': '1-4', 't4': '1-5' } },
  { rowNumber: 35, allocations: { 't_7g': '個別', 't3': '1-3', 't4': '1-12', 't5': '1-3' } },
  { rowNumber: 36, allocations: { 't_7g': '個別', 't1': '1-5', 't3': '2-1', 't4': '1-1', 't5': '1-34' } },
  { rowNumber: 37, allocations: { 't19': '個別', 't_7g': '個別', 't2': '1-3', 't3': '1-2', 't4': '1-56', 't5': '1-2' } },
  { rowNumber: 38, allocations: { 't7': '個別', 't_7g': '個別', 't1': '1-3', 't2': '1-6', 't3': '1-2', 't4': '1-4' } },
  { rowNumber: 39, allocations: { 't_7g': '個別', 't1': '1-2', 't2': '1-5', 't3': '1-1' } },
  { rowNumber: 40, allocations: { 't9': '個別', 't_7g': '個別', 't1': '1-6', 't2': '1-2', 't3': '2-2', 't4': '1-5' } },
  { rowNumber: 41, allocations: { 't19': '個別', 't_7g': '個別', 't1': '1-1', 't3': '3-456', 't4': '1-4', 't5': '2-6' } },
  { rowNumber: 42, allocations: { 't22': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-3', 't4': '1-1', 't5': '3-123' } },
  { rowNumber: 43, allocations: { 't_7g': '個別', 't1': '1-4', 't2': '1-3', 't3': '1-2', 't4': '1-56' } },
  { rowNumber: 44, allocations: { 't19': '個別', 't_7g': '個別', 't1': '1-6', 't2': '1-2', 't3': '1-1', 't4': '1-34' } },
  { rowNumber: 45, allocations: { 't_7g': '個別', 't1': '1-3', 't3': '1-4', 't4': '1-12' } },
  { rowNumber: 46, allocations: { 't_7g': '個別', 't1': '1-2', 't2': '1-5', 't3': '1-1', 't4': '1-3' } },
  { rowNumber: 47, allocations: { 't9': '個別', 't_7g': '個別', 't1': '1-6', 't2': '1-1', 't4': '3-456' } },
  { rowNumber: 48, allocations: { 't30': '個別', 't_7g': '個別', 't1': '1-5', 't2': '1-3', 't3': '1-6' } },
  { rowNumber: 49, allocations: { 't_7g': '個別', 't2': '1-2', 't3': '1-3', 't4': '1-5' } },
  { rowNumber: 50, allocations: { 't_7g': '個別', 't1': '1-4', 't2': '1-2', 't3': '1-3' } },
  { rowNumber: 51, allocations: { 't_7g': '個別', 't1': '1-3', 't2': '1-6', 't3': '1-5' } },
  { rowNumber: 52, allocations: { 't_7g': '個別', 't1': '1-2', 't2': '1-1', 't3': '1-34' } },
  { rowNumber: 53, allocations: { 't14': '個別', 't_7g': '個別', 't1': '1-6', 't2': '1-5', 't4': '1-3' } },
  { rowNumber: 54, allocations: { 't_7g': '個別', 't1': '1-1', 't3': '1-2', 't4': '1-56' } },
];
