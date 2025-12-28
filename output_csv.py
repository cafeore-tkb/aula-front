#!/usr/bin/env python3
"""
Firestoreからシフト回答内容を取得してCSVに出力するスクリプト

各人がどの時間に「入れる」と回答したかを一覧で出力します。

使用方法:
    python output_csv.py <shift_uid>

例:
    python output_csv.py autumn_B_2024
"""

import sys
import csv
from google.cloud import firestore
from datetime import datetime


def get_schedule_from_firestore(shift_uid):
    """
    Firestoreからシフト回答データを取得

    Args:
        shift_uid: シフトのUID (例: "autumn_B_2024")

    Returns:
        dict: シフト回答データ
    """
    # Firestoreクライアントを初期化
    db = firestore.Client()

    # シフト情報を取得
    shift_data = None

    # shiftUsualコレクションから検索
    usual_ref = db.collection("shiftUsual").document(shift_uid)
    usual_doc = usual_ref.get()

    if usual_doc.exists:
        shift_data = usual_doc.to_dict()
        shift_data["uid"] = shift_uid
    else:
        # shiftUnusualコレクションから検索
        unusual_ref = db.collection("shiftUnusual").document(shift_uid)
        unusual_doc = unusual_ref.get()

        if unusual_doc.exists:
            shift_data = unusual_doc.to_dict()
            shift_data["uid"] = shift_uid
        else:
            print(f"エラー: シフト '{shift_uid}' が見つかりません")
            return None

    print(
        f"シフト情報: {shift_data['year']}年度 {shift_data['semester']} モジュール{shift_data['module']}"
    )

    # schedules コレクション名を構築
    collection_name = f"schedules_{shift_data['year']}_{shift_data['semester']}_{shift_data['module']}"

    # スケジュールデータを取得
    schedules_ref = db.collection(collection_name)
    schedules = schedules_ref.stream()

    # ユーザー情報を取得
    users_ref = db.collection("users")
    users_dict = {}
    for user_doc in users_ref.stream():
        user_data = user_doc.to_dict()
        users_dict[user_doc.id] = {
            "name": user_data.get("name", "名前未設定"),
            "isExaminer": user_data.get("isExaminer", False),
        }

    # ユーザーごとのシフト回答を整理
    user_responses = []

    # スケジュールデータを処理
    for schedule_doc in schedules:
        schedule_data = schedule_doc.to_dict()
        user_id = schedule_data.get("userId")
        schedule_items = schedule_data.get("scheduleData", [])

        if not user_id or user_id not in users_dict:
            continue

        user_info = users_dict[user_id]
        responses = {}

        # 各時間帯の回答を記録
        for item in schedule_items:
            period_raw = item.get("period")
            day_name = item.get("day")
            # isSelectedとcanBeAssignedの両方に対応
            can_be_assigned = (
                item.get("canBeAssigned") == True or item.get("isSelected") == True
            )

            # periodは文字列'1'~'8'で保存されているので、数値に変換して0-7にする
            if isinstance(period_raw, str):
                period = int(period_raw) - 1
            else:
                period = period_raw

            if period is not None and day_name is not None:
                key = f"{period}-{day_name}"
                responses[key] = can_be_assigned

        user_responses.append(
            {
                "userId": user_id,
                "name": user_info["name"],
                "isExaminer": user_info["isExaminer"],
                "responses": responses,
            }
        )

    # ユーザーを名前でソート
    user_responses.sort(key=lambda x: x["name"])

    return {"shift_data": shift_data, "user_responses": user_responses}


def export_to_csv(schedule_data, output_file):
    """
    シフト回答データをCSVファイルに出力

    Args:
        schedule_data: シフト回答データ
        output_file: 出力ファイル名
    """
    if not schedule_data:
        return

    shift_data = schedule_data["shift_data"]
    user_responses = schedule_data["user_responses"]

    day_names = ["月", "火", "水", "木", "金", "土", "日"]

    with open(output_file, "w", newline="", encoding="utf-8-sig") as csvfile:
        writer = csv.writer(csvfile)

        # ヘッダー情報
        writer.writerow(
            [
                f"{shift_data['year']}年度 {shift_data['semester']} モジュール{shift_data['module']} シフト回答一覧"
            ]
        )
        writer.writerow([f"出力日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([])

        # テーブルヘッダー（名前、役割、各時限×曜日）
        header = ["名前", "役割"]
        for period in day_names:
            for day_name in range(8):
                header.append(f"{period + 1}限{day_name}")
        writer.writerow(header)

        # 各ユーザーの回答データ
        for user in user_responses:
            row = [user["name"], "試験官" if user["isExaminer"] else "練習生"]

            # 各時限×曜日の回答
            for period in range(8):
                for day_name in day_names:
                    key = f"{period}-{day_name}"
                    can_be_assigned = user["responses"].get(key, False)
                    row.append("○" if can_be_assigned else "×")

            writer.writerow(row)

        # 集計情報
        writer.writerow([])
        writer.writerow(["集計情報"])
        writer.writerow([f"回答者数: {len(user_responses)}"])
        writer.writerow(
            [f'練習生: {sum(1 for u in user_responses if not u["isExaminer"])}']
        )
        writer.writerow(
            [f'試験官: {sum(1 for u in user_responses if u["isExaminer"])}']
        )

    print(f"CSVファイルを出力しました: {output_file}")


def main():
    if len(sys.argv) < 2:
        print("使用方法: python output_csv.py <shift_uid>")
        print("例: python output_csv.py autumn_B_2024")
        sys.exit(1)

    shift_uid = sys.argv[1]

    # Firestoreからデータを取得
    print(f"シフト '{shift_uid}' のデータを取得中...")
    schedule_data = get_schedule_from_firestore(shift_uid)

    if schedule_data:
        # CSVファイル名を生成
        shift_data = schedule_data["shift_data"]
        output_file = f"shift_responses_{shift_data['year']}_{shift_data['semester']}_{shift_data['module']}.csv"

        # CSVに出力
        export_to_csv(schedule_data, output_file)
        print("完了しました！")
    else:
        print("データの取得に失敗しました。")
        sys.exit(1)


if __name__ == "__main__":
    main()
