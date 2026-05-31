/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Gemini API の初期化 (サーバーサイド専用)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// JSON解析の最大サイズを設定（Base64の大きなPDFや画像に対応）
app.use(express.json({ limit: '25mb' }));

// ヘルスチェックエンドポイント
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 行事予定表のPDF/画像解析API
app.post("/api/parse-schedule", async (req: express.Request, res: express.Response) => {
  try {
    const { fileData, mimeType } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "ファイルデータとMIMEタイプが必要です。" });
    }

    // Base64から純粋なデータ部分を取り出し
    const base64Data = fileData.replace(/^data:.*?;base64,/, "");

    const prompt = `あなたは中学校の優秀な事務・時間割管理アシスタントです。
添付された「行事予定表」のPDFまたは画像から、各日付と「校時 (1〜6限)」の時間割情報 (行事や特別授業の名称、またはR8時間割番号) に加え、日課日程タイプ（A日程かB日程か）などの日付情報を正確に抽出し、JSONフォーマットで返却してください。

【抽出ルール】
1. カレンダーに書かれている1日〜31日までのすべての「授業のある稼働日」(休日や閉庁日を除く)について、日付(月/日)と曜日、および1限から6限までの情報を抽出してください。
2. 日付の特定: 行事予定表のヘッダーなどから「何月行事予定」であるか（例：4月、5月、6月、7月など）を必ず特定し、日付を「月/日」（例: 4/13, 5/12, 6/3, 7/1 など）の形式で出力してください。
3. 「校時」あるいは「1 2 3 4 5 6」と書かれている時間割のコマに数字(R8番号、例: 1, 5, 29)や、文字列(例: "学", "道", "総", "対面式")が記載されています。
4. 記載されている数字や文字列(1限〜6限)をそのまま、1限から6限までの順の文字列配列 (長さ6) として抽出してください。
   例: 4月13日(月) 1-6校時の場合： ["1", "2", "3", "5", "道", "総"]
5. 枠が空いている場合(授業がない枠、斜線)は "" (空文字) にしてください。
6. 終日の休業、または全校的な終日イベントの場合（例：開港記念日など）は、その日全体が休業であることが分かるように、1限から6限までそのイベント名を入れて配置するか、あるいは特別なテキスト枠として認識してください。
7. 【日程種別判定 (重要)】各曜日ごとに、「A」または「B」の表記を探して 'A' か 'B' かを正確に抽出してください（一般的にはA日程/B日程、A日課/B日課、または下校目安の先頭に A 15:45 , B 15:35 のように付いています。もし記載されていない場合は、水曜・木曜・金曜など通常の標準日課を 'A'、短縮日課を 'B' などとして推測するか、デフォルトを 'A' と判定してください）。
8. 【給食有無の判定】「給食」の欄や記載、または「給」のマーク、あるいは日常的な学校稼働日であるかを確認して給食があるか判定し、boolean値 (true/false) で返してください。祝日や開港記念日以外の通常の平日授業日は、原則として true としてください。
9. 【下校目安の抽出】「下校」「部活あり下校」などのテキスト枠があれば、その時間もしくは文字列をそのまま 'endText' として抽出してください (例: 「A 14:45」, 「B 12:35」 など)。
10. 【備考メモの抽出】その日の枠の下部などに赤字や備考、注意事項（例:「※1 職員会議のため部活なし」など）があれば、それを 'memo' として抽出してください。
11. アウトプット（レスポンス）は必ず以下のJSONフォーマットのみ（Pure JSON）で返却してください。markdown等の余計な装飾、解説文、\`\`\`json などのコードブロックは絶対に含めないでください。不完全なJSON文字列ではなく、構文的に完全に正しいJSON配列を直接返してください。

【返却JSONフォーマット】
[
  {
    "date": "4/13",
    "day": "月",
    "periods": ["1", "2", "3", "5", "道", "総"],
    "scheduleType": "A",
    "lunch": true,
    "endText": "A 14:45",
    "memo": "健康観察など"
  },
  {
    "date": "4/14",
    "day": "火",
    "periods": ["6", "7", "8", "9", "10", "学"],
    "scheduleType": "A",
    "lunch": true,
    "endText": "A 12:40",
    "memo": "職員出張のため給食後下校"
  },
  {
    "date": "4/16",
    "day": "木",
    "periods": ["19", "20", "21", "22", "家庭", "技"],
    "scheduleType": "B",
    "lunch": true,
    "endText": "B 15:35頃",
    "memo": ""
  }
]`;

    // Gemini API 呼び出し
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const textContent = response.text;
    if (!textContent) {
      throw new Error("Geminiからテキスト出力を得られませんでした。");
    }

    try {
      const parsedData = JSON.parse(textContent.trim());
      return res.json(parsedData);
    } catch (err) {
      console.error("Fail to parse JSON from Gemini text: ", textContent);
      // フォールバック: JSONコードブロックが含まれている場合のトリム
      const jsonContent = textContent.replace(/```json|```/g, "").trim();
      const parsedData = JSON.parse(jsonContent);
      return res.json(parsedData);
    }

  } catch (error: any) {
    console.error("Schedule Parse Error:", error);
    return res.status(500).json({ error: error.message || "行事予定の解析処理に失敗しました。" });
  }
});

// Vite ミドルウェア or 静的ファイル提供
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
