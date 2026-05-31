/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, TimetableMatrixRow } from '../types';

export interface ResolvedLesson {
  plainText: string;     // 全テキスト
  subject: string;       // 教科名 (例: "美術")
  teachersText: string;  // 先生名テキスト (例: "神保T")
  isResolved: boolean;   // 解決できたか
}

/**
 * R8時間割の行とターゲットクラスを元に、時間割に表示する授業情報を動的に解決する。
 * 
 * @param rowNumber 時間割番号 (1〜54)
 * @param targetClass ターゲットクラス (例: "個別", "1-2", "1-3")
 * @param teachers 教員リスト
 * @param matrixRows マトリクスデータ
 */
export function resolveLesson(
  rowNumber: number,
  targetClass: string,
  teachers: Teacher[],
  matrixRows: TimetableMatrixRow[]
): ResolvedLesson {
  const row = matrixRows.find(r => r.rowNumber === rowNumber);
  if (!row) {
    return { plainText: `${rowNumber}`, subject: '', teachersText: '', isResolved: false };
  }

  // rowNumberの行で、割り当てクラスが「targetClass」と一致している教員を探す
  const matchedTeachers: Teacher[] = [];
  Object.entries(row.allocations).forEach(([teacherId, allocatedClass]) => {
    if (allocatedClass === targetClass) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        matchedTeachers.push(teacher);
      }
    }
  });

  if (matchedTeachers.length === 0) {
    // 解決できない場合は番号のみ
    return { plainText: `${rowNumber}`, subject: '', teachersText: '', isResolved: false };
  }

  // 1つの教科にまとめられるか判定 (すべて同じ教科か)
  const subjects = Array.from(new Set(matchedTeachers.map(t => t.subject)));
  const teachersStr = matchedTeachers.map(t => `${t.shortName}T`).join('・');

  if (subjects.length === 1) {
    const subject = subjects[0];
    return {
      plainText: `${rowNumber} ${subject}\n(${teachersStr})`,
      subject,
      teachersText: teachersStr,
      isResolved: true
    };
  } else {
    // 複数教科がある場合 (混在)
    const subject = subjects.join('・');
    return {
      plainText: `${rowNumber} ${subject}\n(${teachersStr})`,
      subject,
      teachersText: teachersStr,
      isResolved: true
    };
  }
}
