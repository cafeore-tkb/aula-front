const fs = require('fs');
const path = require('path');

// JSONファイルのパス
const jsonPath = path.join(__dirname, 'schedules_2025_autumn_B.json');
const outputPath = path.join(__dirname, 'output.csv');

try {
  // JSONファイルを読み込む
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const jsonData = JSON.parse(rawData);

  // ユーザー名のリストを取得（ヘッダー用）
  const users = jsonData.map(entry => entry.userName);

  // ヘッダー作成
  // 最初の2列は日付と時間、それ以降はユーザー名
  const header = ['日付', '時間', ...users].join(',');

  // データを扱いやすい形式に変換
  // userMap[userName][day][period] = slotData
  const userMap = {};
  jsonData.forEach(userEntry => {
    userMap[userEntry.userName] = {};
    userEntry.scheduleData.forEach(slot => {
      if (!userMap[userEntry.userName][slot.day]) {
        userMap[userEntry.userName][slot.day] = {};
      }
      userMap[userEntry.userName][slot.day][slot.period] = slot;
    });
  });

  const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
  const rows = [];

  // ダミーの開始日を設定（2025年秋学期の適当な月曜日）
  // csvToJson関数は日付をパースするが、特定の日付である必要性はロジック上なさそう（週の区切りとして使われる）
  // ここでは2025/10/06(月)を開始日とする
  const startDate = new Date('2025-10-06');

  // 1週間分（7日 × 8時限 = 56行）のデータを生成
  for (let d = 0; d < 7; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);
    
    // 日付フォーマット: YYYY/MM/DD (曜日)
    const dateStr = `${currentDate.getFullYear()}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')} (${dayNames[d]})`;

    for (let p = 1; p <= 8; p++) {
      const periodStr = p.toString();
      
      // 時間帯の取得（最初のユーザーのデータから取得）
      // JSONデータはperiod-majorの可能性があるため、findで検索
      let timeStr = "";
      const firstUser = jsonData[0];
      if (firstUser && firstUser.scheduleData) {
        const slotInfo = firstUser.scheduleData.find(s => s.day === dayNames[d] && s.period === periodStr);
        if (slotInfo) {
          timeStr = `${slotInfo.startTime} ~ ${slotInfo.endTime}`;
        }
      }

      const row = [dateStr, timeStr];

      // 各ユーザーの回答を追加
      users.forEach(user => {
        const userSlot = userMap[user][dayNames[d]]?.[periodStr];
        if (userSlot && userSlot.isSelected) {
          row.push('Yes');
        } else {
          // isSelectedがfalseの場合は空文字（csvToJsonではYes/Maybe以外は無視される）
          row.push(''); 
        }
      });

      rows.push(row.join(','));
    }
  }

  // CSVファイル書き出し
  const csvContent = [header, ...rows].join('\n');
  fs.writeFileSync(outputPath, csvContent);
  
  console.log(`CSV conversion complete. Output saved to: ${outputPath}`);

} catch (error) {
  console.error('Error converting JSON to CSV:', error);
}
