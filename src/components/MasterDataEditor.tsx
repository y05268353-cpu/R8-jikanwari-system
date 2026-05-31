/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Teacher, TimetableMatrixRow } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  RotateCcw, 
  Download, 
  Search, 
  Sparkles, 
  BookOpen, 
  Users, 
  TableProperties, 
  UserPlus, 
  GraduationCap, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { exportMasterToExcel } from '../utils/excelExporter';

interface MasterDataEditorProps {
  teachers: Teacher[];
  matrixRows: TimetableMatrixRow[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateMatrixRows: (rows: TimetableMatrixRow[]) => void;
  onResetToDefault: () => void;
}

export default function MasterDataEditor({
  teachers,
  matrixRows,
  onUpdateTeachers,
  onUpdateMatrixRows,
  onResetToDefault,
}: MasterDataEditorProps) {
  // サブタブ状態: 'byNumber' (コマ別) | 'teachers' (教員一覧) | 'matrix' (マトリクス全体)
  const [activeSubTab, setActiveSubTab] = useState<'byNumber' | 'teachers' | 'matrix'>('byNumber');

  // グローバルな検索とモーダル状態
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  
  // 新規教員登録フォームステート
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherShortName, setNewTeacherShortName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');

  // 1番〜54番の編集でアクティブになっているコマ番号 (初期値は1番)
  const [selectedNum, setSelectedNum] = useState<number>(1);
  const [assignTeacherId, setAssignTeacherId] = useState<string>('');
  const [assignClass, setAssignClass] = useState<string>('');
  const [rowSearchTerm, setRowSearchTerm] = useState('');

  // 1番〜54番の選択中の割当を直接編集に回すための状態
  const [editingAlloc, setEditingAlloc] = useState<{ teacherId: string; classAssigned: string } | null>(null);

  // スプレッドシートマトリクス用のインライン選択状態
  const [activeCell, setActiveCell] = useState<{ rowNumber: number; teacherId: string } | null>(null);

  // クラスの選択肢
  const CLASS_OPTIONS = [
    '', '個別', '1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-12', '1-34', '1-56',
    '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-12', '2-34', '2-56',
    '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-12', '3-123', '3-456',
    '国際', '生指', '合同'
  ];

  // 各教員の割当週合計コマ数を算出
  const getTeacherWorkload = (teacherId: string) => {
    let count = 0;
    matrixRows.forEach(row => {
      if (row.allocations[teacherId]) {
        count++;
      }
    });
    return count;
  };

  // 特定コマ番号（row）の割当一覧を作成
  const getRowAllocationsList = (row: TimetableMatrixRow) => {
    const list: Array<{ teacher: Teacher; classAssigned: string }> = [];
    Object.entries(row.allocations).forEach(([teacherId, allocatedClass]) => {
      if (allocatedClass) {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          list.push({ teacher, classAssigned: allocatedClass });
        }
      }
    });
    return list;
  };

  // 先生を新規追加
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherSubject) return;

    const newId = `t_custom_${Date.now()}`;
    const shortName = newTeacherShortName || newTeacherName.substring(0, 3);
    const newTeacher: Teacher = {
      id: newId,
      name: newTeacherName,
      shortName,
      subject: newTeacherSubject,
    };

    onUpdateTeachers([...teachers, newTeacher]);
    
    // フォームリセット
    setNewTeacherName('');
    setNewTeacherShortName('');
    setNewTeacherSubject('');
    setIsAddingTeacher(false);
  };

  // 先生を削除
  const handleDeleteTeacher = (id: string) => {
    if (confirm('この先生を削除しますか？登録されている時間割マッピングもすべて削除されます。')) {
      onUpdateTeachers(teachers.filter(t => t.id !== id));
      const updatedRows = matrixRows.map(row => {
        const nextAlloc = { ...row.allocations };
        delete nextAlloc[id];
        return { ...row, allocations: nextAlloc };
      });
      onUpdateMatrixRows(updatedRows);
    }
  };

  // 編集中の先生を保存
  const handleSaveEditTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    onUpdateTeachers(teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t));
    setEditingTeacher(null);
  };

  // 編集するためにアサイン内容をフォームへロードする
  const selectAllocForEdit = (rowNum: number, teacherId: string, classAssigned: string) => {
    setSelectedNum(rowNum);
    setAssignTeacherId(teacherId);
    setAssignClass(classAssigned);
    setEditingAlloc({ teacherId, classAssigned });
  };

  // 【コマ別割当画面】 割り当てを追加・または変更
  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherId || !assignClass) return;

    const updatedRows = matrixRows.map(row => {
      if (row.rowNumber === selectedNum) {
        const nextAlloc = { ...row.allocations };

        // 編集モードだった場合、以前選択されていた teacherId への割り当てを一度解除
        if (editingAlloc) {
          delete nextAlloc[editingAlloc.teacherId];
        }

        // 新しいアサインを設定
        nextAlloc[assignTeacherId] = assignClass;

        return {
          ...row,
          allocations: nextAlloc,
        };
      }
      return row;
    });

    onUpdateMatrixRows(updatedRows);
    setAssignTeacherId('');
    setAssignClass('');
    setEditingAlloc(null);
  };

  // 【コマ別割当画面】 割り当てを解除
  const handleRemoveAllocation = (rowNumber: number, teacherId: string) => {
    const updatedRows = matrixRows.map(row => {
      if (row.rowNumber === rowNumber) {
        const nextAlloc = { ...row.allocations };
        delete nextAlloc[teacherId];
        return { ...row, allocations: nextAlloc };
      }
      return row;
    });
    onUpdateMatrixRows(updatedRows);

    if (editingAlloc && rowNumber === selectedNum && teacherId === editingAlloc.teacherId) {
      setAssignTeacherId('');
      setAssignClass('');
      setEditingAlloc(null);
    }
  };

  // 【スプレッドシート表画面】 セル値を直接インライン変更
  const handleCellChange = (rowNumber: number, teacherId: string, value: string) => {
    const updatedRows = matrixRows.map(row => {
      if (row.rowNumber === rowNumber) {
        return {
          ...row,
          allocations: {
            ...row.allocations,
            [teacherId]: value,
          },
        };
      }
      return row;
    });
    onUpdateMatrixRows(updatedRows);
  };

  // 先生検索フィルター
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // コマ番号検索フィルター
  const filteredMatrixRows = matrixRows.filter(row => {
    if (!rowSearchTerm) return true;
    
    // コマ番号に直接一致
    if (row.rowNumber.toString() === rowSearchTerm.trim()) return true;

    // 当該コマ割にアサインされているクラス・先生情報にヒットするか確認
    return Object.entries(row.allocations).some(([teacherId, allocatedClass]) => {
      if (!allocatedClass) return false;
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) return false;

      return (
        allocatedClass.toLowerCase().includes(rowSearchTerm.toLowerCase()) ||
        teacher.name.toLowerCase().includes(rowSearchTerm.toLowerCase()) ||
        teacher.subject.toLowerCase().includes(rowSearchTerm.toLowerCase()) ||
        teacher.shortName.toLowerCase().includes(rowSearchTerm.toLowerCase())
      );
    });
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-xs p-6 space-y-6">
      {/* 画面ヘッダー情報 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            R8時間割マスタ（教員授業コマ管理）
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            教員の登録や、各コマ番号(1〜54番)に対してどの先生が何組の授業を行っているかを直感的に設定・確認できます。
          </p>
        </div>
        
        {/* 全体操作系ボタン */}
        <div id="master-editor-actions" className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddingTeacher(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新規教員を登録</span>
          </button>
          
          <button
            onClick={() => exportMasterToExcel(teachers, matrixRows)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>マスタExcel出力 (.xlsx)</span>
          </button>

          <button
            onClick={() => {
              if (confirm('時間割マスタデータを初期状態にリセットしますか？入力されたすべてのカスタムデータがリセットされます。')) {
                onResetToDefault();
              }
            }}
            className="flex items-center space-x-1 px-3 py-1.5 border border-red-100 hover:bg-red-50 text-red-600 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>マスタ初期化</span>
          </button>
        </div>
      </div>

      {/* サブナビゲーション・タブ (ここが超わかりやすいキーポイント！) */}
      <div className="flex border-b border-slate-100 pb-1 gap-2">
        <button
          onClick={() => setActiveSubTab('byNumber')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'byNumber'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>① 授業の登録・変更 (コマ番号別)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('teachers')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'teachers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>② 教員の一覧・コマ負荷確認</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TableProperties className="w-4 h-4" />
          <span>③ スプレッドシートマトリクス全体表</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* サブタブ1: コマ番号別の登録・変更 */}
      {/* ============================================================== */}
      {activeSubTab === 'byNumber' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 左カラム: 54コマ番号の一覧と検索 */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/50 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">コマ割の絞り込み / 検索</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="クラス名(1-2など)や教員名、教科名..."
                  value={rowSearchTerm}
                  onChange={(e) => setRowSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 max-w-full outline-hidden bg-white"
                />
              </div>
              {rowSearchTerm && (
                <button 
                  onClick={() => setRowSearchTerm('')} 
                  className="text-[10px] text-blue-600 hover:underline block text-right w-full"
                >
                  検索リセット
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[500px] border border-slate-100 rounded-lg divide-y divide-slate-100 bg-white shadow-3xs p-1">
              {filteredMatrixRows.map((row) => {
                const isSelected = selectedNum === row.rowNumber;
                const allocations = getRowAllocationsList(row);

                return (
                  <button
                    key={row.rowNumber}
                    onClick={() => setSelectedNum(row.rowNumber)}
                    className={`w-full text-left p-3 flex items-center justify-between rounded transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-300' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-full ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {row.rowNumber}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">
                          時間割番号 {row.rowNumber}番
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[280px]">
                          {allocations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {allocations.map((alloc, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectAllocForEdit(row.rowNumber, alloc.teacher.id, alloc.classAssigned);
                                  }}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-850 border border-blue-200/50 px-1 py-0.2 rounded-sm text-[9px] font-bold transition-colors cursor-pointer inline-flex items-center gap-0.5"
                                  title="クリックしてこの授業設定を即座に編集にロード"
                                >
                                  {alloc.teacher.shortName}T({alloc.classAssigned})
                                  <Edit className="w-2.5 h-2.5 text-blue-400" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-slate-300">※割当なし (空きコマ等)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <div className="text-blue-600 text-xs font-bold">選択中</div>}
                  </button>
                );
              })}
              {filteredMatrixRows.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  一致する R8 時間割番号が見つかりません。
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: 選択したコマのアサイン詳細とアサインフォーム */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                    {selectedNum}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      R8時間割番号 {selectedNum}番 の割当一覧
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      1つの時間割番号に複数の先生・レッスンを個別にマッピングできます。
                    </p>
                  </div>
                </div>
              </div>

              {/* 現在登録されている割当の一覧 */}
              <div className="space-y-2 bg-white rounded-lg border border-slate-200/50 p-4 min-h-[120px]">
                <span className="text-xs font-bold text-slate-500 block border-b border-slate-100 pb-1.5 mb-2">
                  現在設定されている担当
                </span>

                {(() => {
                  const activeRow = matrixRows.find(r => r.rowNumber === selectedNum);
                  const activeRowAllocs = activeRow ? getRowAllocationsList(activeRow) : [];

                  if (activeRowAllocs.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 space-y-1.5">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span className="text-xs italic">
                          このコマ番号にはまだどのクラス・授業も登録されていません。
                        </span>
                        <span className="text-[10px] text-slate-300">
                          時間割には空白の「空き」としてレンダリングされます。
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-slate-100">
                      {activeRowAllocs.map(({ teacher, classAssigned }, idx) => {
                        const isEditingThis = editingAlloc?.teacherId === teacher.id && editingAlloc?.classAssigned === classAssigned;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectAllocForEdit(selectedNum, teacher.id, classAssigned)}
                            className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition-all text-xs cursor-pointer group ${
                              isEditingThis
                                ? 'bg-blue-50 border border-blue-200/50 text-blue-900 font-semibold shadow-3xs'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            title="クリックしてこの割当内容をフォームへロード"
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isEditingThis ? 'bg-blue-600 animate-pulse' : 'bg-blue-400'}`}></span>
                              <span className="font-bold text-slate-800">{teacher.name}</span>
                              <span className="text-slate-400 font-normal">({teacher.subject})</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded text-[10px]">
                                担当：{classAssigned}組
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectAllocForEdit(selectedNum, teacher.id, classAssigned);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 px-2 py-1 rounded transition-colors flex items-center space-x-0.5 font-bold cursor-pointer"
                                title="編集フォームにロード"
                              >
                                <Edit className="w-2.5 h-2.5" />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`【${teacher.name} — ${classAssigned}組】の割当を解除しますか？`)) {
                                    handleRemoveAllocation(selectedNum, teacher.id);
                                  }
                                }}
                                className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center space-x-0.5 font-semibold cursor-pointer"
                                title="割当を解除する"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>解除</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* 割当フォーム */}
              <form 
                onSubmit={handleAddAllocation} 
                className={`bg-white border rounded-lg p-4 space-y-3 transition-colors ${
                  editingAlloc 
                    ? 'border-blue-400 bg-blue-50/10 shadow-3xs' 
                    : 'border-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 block">
                    {editingAlloc ? '💡 授業割当の編集・変更保存' : '新規授業コマの追加（教員の割り当て）'}
                  </span>
                  {editingAlloc && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignTeacherId('');
                        setAssignClass('');
                        setEditingAlloc(null);
                      }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-red-500 hover:bg-slate-100 px-2 py-1 rounded transition-all cursor-pointer"
                    >
                      キャンセル(解除)
                    </button>
                  )}
                </div>

                {editingAlloc && (
                  <p className="text-[10px] text-blue-600 leading-relaxed font-medium bg-blue-50/50 p-2 rounded border border-blue-100">
                    現在、<strong>時間割番号 {selectedNum}番</strong> の授業登録を変更中です。
                    教員やクラスを選び直して<strong>【変更内容を登録・更新する】</strong>ボタンを押すと、このコマに上書き保存されます。
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="teacher-select" className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">教員を選択</label>
                    <select
                      id="teacher-select"
                      required
                      value={assignTeacherId}
                      onChange={(e) => setAssignTeacherId(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded focus:border-blue-500 bg-white"
                    >
                      <option value="">担当の先生を選択...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject} / {t.shortName}T)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="class-select" className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">割当クラス（宛先）</label>
                    <select
                      id="class-select"
                      required
                      value={assignClass}
                      onChange={(e) => setAssignClass(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded focus:border-blue-500 bg-white"
                    >
                      <option value="">クラスを選択...</option>
                      {CLASS_OPTIONS.filter(o => o !== '').map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1 gap-2">
                  <button
                    type="submit"
                    disabled={!assignTeacherId || !assignClass}
                    className={`flex items-center space-x-1 px-4 py-2 rounded text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      !assignTeacherId || !assignClass
                        ? 'bg-slate-250 text-slate-400'
                        : editingAlloc
                        ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                    }`}
                  >
                    {editingAlloc ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>変更内容をアサイン登録・更新する</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>この設定でコマに教員をアサインする</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* サブタブ2: 教員の一覧・コマ負荷確認 */}
      {/* ============================================================== */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4 text-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200/50">
            <div>
              <h4 className="text-xs font-bold text-slate-800">登録済み教員 & コマ負荷状況</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                教員の登録、および設定中の54コマから、各教員が合計何コマ分時間割にアサインされているかを自動計算します。
              </p>
            </div>
            {/* 検索入力 */}
            <div className="w-full sm:max-w-xs relative shrink-0">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="教員名や担当教科で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white outline-hidden"
              />
            </div>
          </div>

          {/* 教員カードグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => {
              const workload = getTeacherWorkload(teacher.id);

              return (
                <div 
                  key={teacher.id} 
                  className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 flex flex-col justify-between shadow-3xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">{teacher.name}</h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {teacher.subject}担当 ({teacher.shortName}T)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shadow-3xs">
                      <button
                        onClick={() => setEditingTeacher(teacher)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="先生情報を編集"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 負荷表示バー */}
                  <div className="bg-slate-50 rounded border border-slate-100 p-2 text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-medium text-[10px]">合計授業時間数:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        workload > 12 
                          ? 'bg-orange-50 text-orange-600' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {workload} 時間
                      </span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${workload > 12 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min((workload / 20) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 新規追加用プレースホルダーカード */}
            <button
              onClick={() => setIsAddingTeacher(true)}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-5 flex flex-col items-center justify-center space-y-2 text-slate-400 hover:text-blue-600 bg-slate-50/20 hover:bg-blue-50/5 transition-all text-center min-h-[140px] cursor-pointer"
            >
              <UserPlus className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-bold">教員を新規登録する</span>
              <span className="text-[10px] text-slate-400 font-normal">新しい先生と教科をリストに加えます</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* サブタブ3: スプレッドシートマトリクス全体表 (旧仕様パワービュー) */}
      {/* ============================================================== */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200/50">
            <div>
              <h4 className="text-xs font-bold text-slate-800">スプレッドシート形式（教員・コマ別一括マトリクス）</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                横軸：全教員、縦軸：コマ番号(1〜54)。セルをクリックして対象クラスを瞬時にインライン変更可能です。
              </p>
            </div>
            {/* 検索入力 */}
            <div className="w-full sm:max-w-xs relative shrink-0">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="教員を名前や教科で絞り込み..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 bg-white outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200/80 rounded-lg">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table id="r8-master-table" className="min-w-max w-full border-collapse text-left relative">
                {/* ヘッダー */}
                <thead className="bg-slate-50 sticky top-0 z-20 shadow-3xs">
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-xs font-bold text-slate-600 sticky left-0 z-30 bg-slate-100 border-r border-slate-200">
                      番号
                    </th>
                    {filteredTeachers.map((teacher) => (
                      <th 
                        key={teacher.id} 
                        className="p-3 text-xs font-bold text-slate-700 border-r border-slate-200 bg-slate-50 min-w-[100px] hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-slate-800">
                            {teacher.name}
                            <span className="block text-[9px] text-blue-500 font-medium mt-0.5 font-semibold">
                              {teacher.subject} ({teacher.shortName}T)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTeacher(teacher);
                              }}
                              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="先生情報を編集"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeacher(teacher.id);
                              }}
                              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* ボディー (1〜54行) */}
                <tbody className="divide-y divide-slate-100 bg-white">
                  {matrixRows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50/50">
                      {/* 番号 */}
                      <td className="p-2.5 text-xs text-center font-bold text-slate-600 bg-slate-100 border-r border-slate-200 sticky left-0 z-10">
                        {row.rowNumber}
                      </td>
                      
                      {/* 各教員の割当セル */}
                      {filteredTeachers.map((teacher) => {
                        const value = row.allocations[teacher.id] || '';
                        const isActive = activeCell?.rowNumber === row.rowNumber && activeCell?.teacherId === teacher.id;
                        const isSpecial = value === '個別' || value === '合同';

                        return (
                          <td
                            key={teacher.id}
                            onClick={() => setActiveCell({ rowNumber: row.rowNumber, teacherId: teacher.id })}
                            className={`p-1.5 border-r border-b border-dashed border-slate-200 text-center relative max-w-[120px] transition-colors cursor-pointer ${
                              isSpecial ? 'bg-amber-50/40 hover:bg-amber-100/30' : 'hover:bg-slate-50'
                            }`}
                          >
                            {isActive ? (
                              <div className="flex items-center justify-center">
                                <select
                                    value={value}
                                    onChange={(e) => {
                                      handleCellChange(row.rowNumber, teacher.id, e.target.value);
                                      setActiveCell(null); // クローズ
                                    }}
                                    onBlur={() => setTimeout(() => setActiveCell(null), 150)}
                                    autoFocus
                                    className="w-full text-xs p-1 border border-blue-400 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-semibold"
                                  >
                                    {CLASS_OPTIONS.map(opt => (
                                      <option key={opt} value={opt}>{opt || 'ー'}</option>
                                    ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[22px]">
                                {value ? (
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold select-none ${
                                    value === '個別' 
                                      ? 'bg-red-50 text-red-600' 
                                      : value.startsWith('1')
                                        ? 'bg-sky-50 text-sky-600/80'
                                        : value.startsWith('2')
                                          ? 'bg-emerald-50 text-emerald-600/80'
                                          : 'bg-blue-50/50 text-blue-600'
                                  }`}>
                                    {value}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 scale-75 block">ー</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* モーダル: 教員の編集 */}
      {/* ============================================================== */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">教員情報の編集</h4>
            <form onSubmit={handleSaveEditTeacher} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">氏名 (フルネーム)</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.name}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">略称 (鈴木T用などの苗字)</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.shortName}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, shortName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">担当教科</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.subject}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, subject: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs hover:bg-slate-50 text-slate-600 bg-white cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  変更を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* モーダル: 新規教員の追加 (全体用) */}
      {/* ============================================================== */}
      {isAddingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">新規教員の登録</h4>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">教員のフルネーム (例: 鈴木 太郎)</label>
                <input
                  type="text"
                  required
                  placeholder="鈴木 太郎"
                  value={newTeacherName}
                  onChange={(e) => {
                    setNewTeacherName(e.target.value);
                    if (!newTeacherShortName) {
                      // 名字を推測
                      const split = e.target.value.split(' ')[0] || e.target.value.split('　')[0] || e.target.value;
                      setNewTeacherShortName(split);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">略称 (鈴木 T用など、名字)</label>
                  <input
                    type="text"
                    placeholder="鈴木"
                    value={newTeacherShortName}
                    onChange={(e) => setNewTeacherShortName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">担当教科 (例: 英語)</label>
                  <input
                    type="text"
                    required
                    placeholder="英語"
                    value={newTeacherSubject}
                    onChange={(e) => setNewTeacherSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs outline-hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingTeacher(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-xs hover:bg-slate-50 text-slate-600 bg-white cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  教員を追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
