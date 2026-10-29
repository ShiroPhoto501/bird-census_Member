/**
 * 野鳥野帳 → Googleドライブ 受け取り用スクリプト (Google Apps Script)
 *
 * アプリから送られたファイル(Excel / CSV / GPX)を、指定のフォルダに保存します。
 * フォルダへの書き込み権限のあるGoogleアカウントで作成・デプロイしてください。
 */
const FOLDER_ID = '1uMxyqWezPwcr-ManzY2D9oDe0Zk6NuZz';   // 保存先フォルダのID
const TOKEN = 'ここを長いランダムな文字列に変える';          // config.js の token と同じにする
const MAX_BYTES = 20 * 1024 * 1024;                          // 1ファイルの上限(20MB)
const TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  gpx: 'application/gpx+xml'
};

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!req || req.token !== TOKEN) return reply({ ok: false, error: 'unauthorized' });

    let name = String(req.name || '').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 120);
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (!TYPES[ext]) return reply({ ok: false, error: 'file type not allowed' });

    const bytes = Utilities.base64Decode(String(req.data || ''));
    if (!bytes.length || bytes.length > MAX_BYTES) return reply({ ok: false, error: 'bad size' });

    const folder = DriveApp.getFolderById(FOLDER_ID);
    if (folder.getFilesByName(name).hasNext()) {            // 同名があれば時刻を付けて、上書きしない
      const t = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'HHmmss');
      name = name.replace(/\.[^.]+$/, '') + '_' + t + '.' + ext;
    }
    const file = folder.createFile(Utilities.newBlob(bytes, TYPES[ext], name));
    return reply({ ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function doGet() {                                           // 動作確認用(ブラウザでURLを開くと表示)
  return reply({ ok: true, message: '野鳥野帳 アップロード受け口' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
