import os
import uvicorn
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI()

# 프론트엔드 접속 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🌟 [경로 버그 해결] 실행되는 위치와 상관없이 무조건 main.py 옆에 있는 엑셀을 찾도록 수정
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
EXCEL_FILE = os.path.join(current_dir, "내전 기록표(업그레이드 버전).xlsx")

# 주소 충돌 없도록 각각의 파일을 1:1로 정확하게 서빙
@app.get("/")
def read_index():
    return FileResponse(os.path.join(parent_dir, "index.html"))

@app.get("/style.css")
def read_style():
    return FileResponse(os.path.join(parent_dir, "style.css"))

@app.get("/script.js")
def read_script():
    return FileResponse(os.path.join(parent_dir, "script.js"))

@app.get("/api/players")
def get_players():
    if not os.path.exists(EXCEL_FILE):
        print(f"❌ 오류: '{EXCEL_FILE}' 파일이 지정된 경로에 없습니다!")
        return []

    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name="PLAYER_STATS")
        
        players_list = []
        for _, row in df.iterrows():
            name = row.get("닉네임", "")
            if pd.isna(name) or not str(name).strip() or str(name).strip() == "nan" or str(name).strip() == "None":
                continue
            
            name = str(name).strip()
            win_rate_raw = row.get("승률", 0)
            win_rate = win_rate_raw * 100 if win_rate_raw <= 1 else win_rate_raw
            kda_val = row.get("평균 KDA", 0)
            
            m1 = row.get("모스트 1", "-")
            m2 = row.get("모스트 2", "-")
            m3 = row.get("모스트 3", "-")
            
            players_list.append({
                "id": f"p_{name}",
                "name": name,
                "tier": 5,
                "matches": int(row.get("경기 수", 0)) if pd.notnull(row.get("경기 수")) else 0,
                "win": int(row.get("승", 0)) if pd.notnull(row.get("승")) else 0,
                "lose": int(row.get("패", 0)) if pd.notnull(row.get("패")) else 0,
                "winRate": f"{win_rate:.1f}",
                "kda": f"{float(kda_val):.2f}" if pd.notnull(kda_val) else "0.00",
                "most": f"{m1} / {m2} / {m3}"
            })
            
        return players_list
    except Exception as e:
        print(f"❌ 엑셀 읽기 오류: {e}")
        return []

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
