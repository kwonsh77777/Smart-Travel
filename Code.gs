function doGet(e) {
  // 'Index.html' 파일을 로드하여 웹 앱 화면으로 출력합니다.
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('스마트여행이력')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // 외부 iFrame 삽입 허용
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// =================================================================
// 1. 프론트엔드(HTML)에서 누군가 접속할 때마다 호출되는 함수 (로그 기록)
// =================================================================
function logAccess(username) {
  const sheetId = '19-kIGLCgPxEBTm24T_kNlwoCbxZfSF23JxQmcD3Ad-c';
  
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName('로그인이력');
    
    // 만약 '로그인이력' 시트가 없다면 자동으로 생성합니다.
    if (!sheet) {
      sheet = ss.insertSheet('로그인이력');
      sheet.appendRow(['접속일시', '접속자 이름']);
      sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#f0f0f0");
    }
    
    // 한국 시간 기준으로 저장
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([dateStr, username]);
    
  } catch (error) {
    console.error("로그 기록 에러: " + error.toString());
  }
}

// =================================================================
// 2. 동기화 버튼 클릭 시 1건씩 구글 드라이브와 시트에 저장하는 함수
// =================================================================
function saveSingleTravelRecord(record, username) {
  const ssId = '19-kIGLCgPxEBTm24T_kNlwoCbxZfSF23JxQmcD3Ad-c';
  const folderId = '16t1AZdiFzgQIxfAAb29_fvjXFOb7PVwf';

  try {
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName('여행내역');

    // 시트가 없으면 헤더와 함께 새로 생성 (사진1 ~ 사진50까지 반복문으로 셋팅)
    if (!sheet) {
      sheet = ss.insertSheet('여행내역');
      const headers = ['날짜', '이름', '사용장소', '금액(현지)', '금액(KRW)', '금액(USD)', '메모'];
      
      // 사진 헤더 50개 생성
      for(let i = 1; i <= 50; i++) {
        headers.push('사진' + i);
      }
      
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f0f0f0");
    }

    const folder = DriveApp.getFolderById(folderId);
    let photoUrls = [];

    // 사진(Base64)이 존재하면 구글 드라이브에 이미지 파일로 생성 후 URL 추출
    if (record.photos && record.photos.length > 0) {
      record.photos.forEach((base64Data, index) => {
        try {
          const parts = base64Data.split(',');
          const mimeType = parts[0].match(/:(.*?);/)[1];
          const decodedData = Utilities.base64Decode(parts[1]);
          
          let ext = "jpeg";
          if (mimeType.includes("png")) ext = "png";
          else if (mimeType.includes("webp")) ext = "webp";

          const safeDate = (record.date || "").replace(/[^0-9]/g, '');
          const fileName = `photo_${username}_${safeDate}_${index+1}.${ext}`;
          
          const blob = Utilities.newBlob(decodedData, mimeType, fileName);
          const file = folder.createFile(blob);
          
          // 누구나 링크로 사진을 볼 수 있도록 권한 설정 (웹앱에서 엑스박스 방지)
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          photoUrls.push(file.getUrl());
        } catch(e) {
          photoUrls.push("업로드 에러");
        }
      });
    }

    // 시트에 기록할 행(Row) 데이터 기본 정보 조립
    const row = [
      record.date || '',
      username || '',
      record.place || '',
      record.vnd || '',
      record.krw || '',
      record.usd || '',
      record.memo || ''
    ];

    // 사진 URL 50개 칸 채우기 (반복문 사용으로 코드 50줄 단축!)
    for(let i = 0; i < 50; i++) {
      row.push(photoUrls[i] || "");
    }

    // 시트에 최종 행 추가
    sheet.appendRow(row);
    return "SUCCESS";

  } catch (error) {
    throw new Error("서버 저장 실패: " + error.toString());
  }
}

// =================================================================
// 3. 서버(시트)에 저장된 내역을 조회하여 프론트엔드로 보내주는 함수
// =================================================================
function fetchServerTravelRecords(startDate, endDate) {
  const sheetId = '19-kIGLCgPxEBTm24T_kNlwoCbxZfSF23JxQmcD3Ad-c';
  
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('여행내역');
    
    // 시트가 없거나 헤더(1행)밖에 없으면 빈 배열 반환
    if (!sheet) return { status: "SUCCESS", data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "SUCCESS", data: [] };

    const records = [];
    
    // 검색 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
    const startStr = startDate ? startDate.replace(/-/g, '.') : null;
    const endStr = endDate ? endDate.replace(/-/g, '.') : null;

    // 2번째 행(데이터 행)부터 순회
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dateVal = row[0].toString();
      const dateOnly = dateVal.split(' ')[0]; 

      // 날짜 필터링
      if (startStr && endStr) {
        if (dateOnly < startStr || dateOnly > endStr) continue;
      } else if (startStr && dateOnly !== startStr) {
        continue;
      } else if (endStr && dateOnly !== endStr) {
        continue;
      }

      // 프론트엔드가 사용할 수 있는 객체로 변환
      const record = {
        date: row[0],
        customName: "베트남 동 (VND)", 
        customSymbol: "₫",
        place: row[2],
        vnd: row[3],
        krw: row[4],
        usd: row[5],
        memo: row[6],
        photos: []
      };

      // 7번째 열(사진1)부터 최대 50개의 사진 URL 가져오기
      for(let j = 7; j < 57; j++) {
        if (row[j] && row[j].toString().trim() !== "") {
          record.photos.push(row[j].toString());
        }
      }
      records.push(record);
    }

    return { status: "SUCCESS", data: records };
    
  } catch (error) {
    return { status: "ERROR", message: error.toString() };
  }
}
