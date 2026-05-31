/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Teacher, TimetableTemplateCell, DayTimelineInfo, TimetableMatrixRow } from './types';
import { 
  INITIAL_TEACHERS, 
  INITIAL_TEMPLATE_CELLS, 
  INITIAL_DAY_TIMELINES, 
  INITIAL_MATRIX_ROWS 
} from './data';
import TimetablePreview from './components/TimetablePanel';
import MasterDataEditor from './components/MasterDataEditor';
import TemplateEditor from './components/TemplateEditor';
import ScheduleImporter from './components/ScheduleImporter';
import { exportToExcel } from './utils/excelExporter';
import { 
  Calendar, 
  Sparkles, 
  BookOpen, 
  Settings2, 
  Download, 
  HelpCircle, 
  Users, 
  Layers,
  Printer
} from 'lucide-react';

export default function App() {
  // ステート。LocalStorageから復元、または初期値
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('r8_timetable_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [templateCells, setTemplateCells] = useState<TimetableTemplateCell[]>(() => {
    const saved = localStorage.getItem('r8_timetable_template_cells');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATE_CELLS;
  });

  const [dayTimelines, setDayTimelines] = useState<DayTimelineInfo[]>(() => {
    const saved = localStorage.getItem('r8_timetable_day_timelines');
    return saved ? JSON.parse(saved) : INITIAL_DAY_TIMELINES;
  });

  const [matrixRows, setMatrixRows] = useState<TimetableMatrixRow[]>(() => {
    const saved = localStorage.getItem('r8_timetable_matrix_rows');
    return saved ? JSON.parse(saved) : INITIAL_MATRIX_ROWS;
  });

  // 対象クラス (個別、1-2, 1-3など)
  const [targetClass, setTargetClass] = useState<string>(() => {
    const saved = localStorage.getItem('r8_timetable_target_class');
    return saved ? JSON.parse(saved) : '個別';
  });

  // 現在アクティブなタブ ('preview' | 'master' | 'template')
  const [activeTab, setActiveTab] = useState<'preview' | 'master' | 'template'>('preview');

  // ステートが変更されたらLocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem('r8_timetable_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('r8_timetable_template_cells', JSON.stringify(templateCells));
  }, [templateCells]);

  useEffect(() => {
    localStorage.setItem('r8_timetable_day_timelines', JSON.stringify(dayTimelines));
  }, [dayTimelines]);

  useEffect(() => {
    localStorage.setItem('r8_timetable_matrix_rows', JSON.stringify(matrixRows));
  }, [matrixRows]);

  useEffect(() => {
    localStorage.setItem('r8_timetable_target_class', JSON.stringify(targetClass));
  }, [targetClass]);

  // 全て初期状態に戻す
  const handleResetToDefault = () => {
    setTeachers(INITIAL_TEACHERS);
    setTemplateCells(INITIAL_TEMPLATE_CELLS);
    setDayTimelines(INITIAL_DAY_TIMELINES);
    setMatrixRows(INITIAL_MATRIX_ROWS);
    setTargetClass('個別');
  };

  // クラスの候補リストを作成 (マトリクスデータに存在するものを動的に重複クリアして抽出)
  const availableClasses = Array.from(
    new Set([
      '個別',
      ...matrixRows.flatMap(row => Object.values(row.allocations))
    ])
  ).filter(c => c && c.trim() !== '' && c !== '個別').sort();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased pb-16">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold tracking-tight text-sm">
              R8
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 leading-none">
                時間割自動作成システム <span className="text-slate-400 font-normal ml-1">| 令和8年度 (R8)</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* クラス切り替えセレクター */}
            <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1 border border-slate-200/40">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>表示対象:</span>
              </span>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-md px-2.5 py-0.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
              >
                <option value="個別">個別 (7組)</option>
                <option value="国際">国際</option>
                <option value="生指">生指</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* サブヒーロー・説明エリア */}
      <div className="bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                <span>HINA-GATA SYSTEM</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight ml-0.5">
                番号を入れるだけで、すべての時間割コマが自動解決
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl ml-0.5 leading-relaxed">
                雛形テンプレートにR8時間割の「コマ番号」を設定すると、マトリクスから自動的に誰がどの教室でどの授業を行っているかを瞬時に判定。美しくレイアウトされたExcelファイルを即時にエクスポート可能です。
              </p>
            </div>

            {/* 操作アクションボタン */}
            <div className="flex flex-wrap items-center gap-3 no-print">
              {/* 印刷ボタン */}
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-slate-200 cursor-pointer"
                title="プレビューと全く同じレイアウトで紙に美しく印刷します(A4縦推奨、各週1枚改ページ対応)"
              >
                <Printer className="w-4 h-4" />
                <span>時間割を印刷</span>
              </button>

              {/* Excelダウンロードボタン */}
              <button
                onClick={() => exportToExcel(targetClass, teachers, templateCells, dayTimelines, matrixRows)}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-emerald-100 cursor-pointer"
                title="プレビューと全く同じ配色・セルマージを持った美しくレイアウトされたExcelファイルを保存します"
              >
                <Download className="w-4 h-4" />
                <span>Excelシート出力 (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインスペース */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 w-full space-y-6">
        {/* タブナビゲーション */}
        <div className="flex bg-slate-100 rounded-lg p-1 max-w-md border border-slate-200/50 gap-1 no-print">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium rounded transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>時間割プレビュー</span>
          </button>
          
          <button
            onClick={() => setActiveTab('master')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium rounded transition-all ${
              activeTab === 'master'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>R8時間割マスタ</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-medium rounded transition-all ${
              activeTab === 'template'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>時間割雛形設定</span>
          </button>
        </div>

        {/* 各タブのコンテンツレンダリング */}
        <div className="transition-all duration-200">
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* 行事予定表自動インポート */}
              <div className="no-print">
                <ScheduleImporter
                  templateCells={templateCells}
                  onUpdateTemplateCells={setTemplateCells}
                  dayTimelines={dayTimelines}
                  onUpdateDayTimelines={setDayTimelines}
                />
              </div>

              {/* 簡単な使い方の説明 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-slate-600 no-print">
                <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-slate-800">2週間自動生成システムのご案内：</span>
                  <p className="leading-relaxed text-slate-500">
                    現在の「表示対象」の割当に従って2週間分の時間割を自動同期したプレビューです。体育祭や開港記念日のマージ、時間割下部の「給食有無」「学活終了時刻（下校目安）」まで美しく一括描画されます。先生方のマスタ担当変更や、各セルの時間割番号は上部のタブからいつでも編集でき、すべて自動反映・保存されます。
                  </p>
                </div>
              </div>

              {/* 時間割ボードプレビュー */}
              <TimetablePreview
                targetClass={targetClass}
                teachers={teachers}
                templateCells={templateCells}
                dayTimelines={dayTimelines}
                matrixRows={matrixRows}
                onUpdateTemplateCells={setTemplateCells}
                onUpdateDayTimelines={setDayTimelines}
              />
            </div>
          )}

          {activeTab === 'master' && (
            <div className="animate-fade-in">
              <MasterDataEditor
                teachers={teachers}
                matrixRows={matrixRows}
                onUpdateTeachers={setTeachers}
                onUpdateMatrixRows={setMatrixRows}
                onResetToDefault={handleResetToDefault}
              />
            </div>
          )}

          {activeTab === 'template' && (
            <div className="animate-fade-in">
              <TemplateEditor
                templateCells={templateCells}
                dayTimelines={dayTimelines}
                onUpdateTemplateCells={setTemplateCells}
                onUpdateDayTimelines={setDayTimelines}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
