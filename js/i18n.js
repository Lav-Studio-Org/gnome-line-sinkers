// UI copy. Indonesian first (studio default), English second. Pick with KL.t('key', {vars}).
(function (root) {
  'use strict';
  const KL = (root.KL = root.KL || {});
  const STR = {
    id: {
      cast: 'Lempar', tree: 'Skill', book: 'Buku Ikan', settings: 'Pengaturan', auto: 'Otomatis',
      perSec: '/dtk', depth: 'Kedalaman', best: 'Terdalam', line: 'Tali',
      hintSteer: 'Kail mengikuti jari atau kursormu. Hindari ikan, bulu babi dan ranjau saat turun.',
      tapSea: 'Ketuk laut untuk melempar', sting: 'Tertusuk!', boom: 'Ranjau!', lost: 'Ikan lepas', net: 'Jaring', current: 'Arus',
      menu: 'Menu', tagline: 'Incremental memancing', menuContinue: 'Lanjutkan', menuStart: 'Mulai main', menuNew: 'Main baru',
      menuImport: 'Muat file', menuExport: 'Simpan file', menuCredits: 'Kredit',
      menuNewConfirm: 'Mulai dari awal? Progres sekarang akan terhapus. Simpan ke file dulu kalau mau menyimpannya.',
      slotInfo: 'Musim {s} · terdalam {d} m · {n} jenis ikan', noSave: 'Belum ada simpanan. Laut menunggu.',
      importConfirm: 'Ganti progres sekarang dengan simpanan dari file ini?', importOk: 'Simpanan dimuat', importBad: 'File ini bukan simpanan yang valid.',
      exportOk: 'File simpanan diunduh',
      creditsHead: 'Kredit', creditGame: 'Desain, kode, musik dan suara: Lav Studio',
      hintCatch: 'Sekarang naik: sentuh ikan untuk menangkapnya!',
      hintKeys: 'Panah / A D juga bisa',
      haul: 'Tangkapan', haulEmpty: 'Kail kosong kali ini. Laut sedang malu-malu.',
      take: 'Ambil', fullBonus: 'Peti penuh', bulkBonus: 'Borongan', catBonus: 'Bonus kucing',
      total: 'Total', newSpecies: 'Ikan baru', newZone: 'Zona baru', moonNight: 'Malam purnama: mutasi x3',
      hit: 'Tersangkut!', bottom: 'Dasar tali', guard: 'Tembus', full: 'Penuh!', slow: 'Fokus',
      lv: 'Lv', max: 'Maks', now: 'Sekarang', next: 'Berikutnya', buy: 'Beli', locked: 'Terkunci',
      mystery: 'Belum diketahui', mysteryDesc: 'Beli skill di sebelahnya untuk membuka.',
      needPearls: 'Butuh mutiara', season: 'Musim Baru', seasonDesc: 'Mulai ulang skill koin, simpan koleksi. Rekor kedalaman baru memberi {n} mutiara (tiap mutiara +10% nilai ikan, selamanya). Makin dalam, makin banyak.',
      seasonLocked: 'Capai Palung ({d} m) untuk membuka Musim Baru.', seasonGo: 'Mulai musim baru', seasonConfirm: 'Yakin? Koin dan skill koin kembali ke awal.',
      pearls: 'Mutiara', coins: 'Koin', seasonN: 'Musim',
      collection: 'Koleksi', found: 'ditemukan', caught: 'ditangkap', unknown: '???', bookBonus: 'Bonus koleksi', bookHint: 'Tiap varian baru (ikan atau mutasi) memberi +1% nilai semua ikan. Tangkap 10, 50, 250, 1000 ekor untuk +25% nilai jenis itu.',
      sound: 'Suara', music: 'Musik', haptics: 'Getar', language: 'Bahasa', reset: 'Hapus progres', resetConfirm: 'Hapus semua progres? Tidak bisa dibatalkan.',
      credits: 'Ikan laut dalam, gnome, kapal, rintangan dan antarmuka juga buatan kami.',
      welcome: 'Selamat datang kembali', welcomeBody: 'Keramba bekerja selama {t}.', welcomeCap: 'Batas offline {h} jam tercapai.',
      autoOn: 'Nelayan otomatis aktif', autoOff: 'Nelayan otomatis mati',
      pen: 'Keramba', on: 'Nyala', off: 'Mati', close: 'Tutup', back: 'Kembali',
      hours: 'jam', minutes: 'menit',
      mutBig: 'Besar', mutGold: 'Emas', mutPrism: 'Pelangi', mutTitan: 'Raksasa',
      tapToStart: 'Ketuk untuk mulai', pause: 'Jeda',
    },
    en: {
      cast: 'Cast', tree: 'Skills', book: 'Fishdex', settings: 'Settings', auto: 'Auto',
      perSec: '/s', depth: 'Depth', best: 'Deepest', line: 'Line',
      hintSteer: 'The hook follows your finger or cursor. Dodge fish, urchins and mines on the way down.',
      tapSea: 'Tap the sea to cast', sting: 'Ouch!', boom: 'Mine!', lost: 'Fish lost', net: 'Net', current: 'Current',
      menu: 'Menu', tagline: 'A fishing incremental', menuContinue: 'Continue', menuStart: 'Start', menuNew: 'New game',
      menuImport: 'Load file', menuExport: 'Save file', menuCredits: 'Credits',
      menuNewConfirm: 'Start over? Your current progress will be erased. Save it to a file first if you want to keep it.',
      slotInfo: 'Season {s} · deepest {d} m · {n} species', noSave: 'No save yet. The sea is waiting.',
      importConfirm: 'Replace your current progress with the save in this file?', importOk: 'Save loaded', importBad: 'This file is not a valid save.',
      exportOk: 'Save file downloaded',
      creditsHead: 'Credits', creditGame: 'Design, code, music and sound: Lav Studio',
      hintCatch: 'Now going up: touch fish to catch them!',
      hintKeys: 'Arrow keys / A D work too',
      haul: 'Haul', haulEmpty: 'Empty hook this time. The sea is feeling shy.',
      take: 'Collect', fullBonus: 'Full crate', bulkBonus: 'Bulk order', catBonus: 'Cat bonus',
      total: 'Total', newSpecies: 'New fish', newZone: 'New zone', moonNight: 'Full moon: mutations x3',
      hit: 'Snagged!', bottom: 'End of line', guard: 'Pass', full: 'Full!', slow: 'Focus',
      lv: 'Lv', max: 'Max', now: 'Now', next: 'Next', buy: 'Buy', locked: 'Locked',
      mystery: 'Unknown', mysteryDesc: 'Buy the skill next to it to reveal.',
      needPearls: 'Needs pearls', season: 'New Season', seasonDesc: 'Reset coin skills, keep your collection. New depth records earn {n} pearls (each pearl +10% fish value, forever). Go deeper for more.',
      seasonLocked: 'Reach the Trench ({d} m) to unlock a New Season.', seasonGo: 'Start new season', seasonConfirm: 'Sure? Coins and coin skills go back to the start.',
      pearls: 'Pearls', coins: 'Coins', seasonN: 'Season',
      collection: 'Collection', found: 'found', caught: 'caught', unknown: '???', bookBonus: 'Collection bonus', bookHint: 'Every new variant (fish or mutation) gives +1% to all fish value. Catch 10, 50, 250, 1000 of a kind for +25% value on that kind.',
      sound: 'Sound', music: 'Music', haptics: 'Vibration', language: 'Language', reset: 'Erase progress', resetConfirm: 'Erase all progress? This cannot be undone.',
      credits: 'Deep sea fish, gnome, boat, obstacles and interface are ours too.',
      welcome: 'Welcome back', welcomeBody: 'Your fish pen worked for {t}.', welcomeCap: 'Offline limit of {h} h reached.',
      autoOn: 'Auto angler on', autoOff: 'Auto angler off',
      pen: 'Fish pen', on: 'On', off: 'Off', close: 'Close', back: 'Back',
      hours: 'h', minutes: 'min',
      mutBig: 'Big', mutGold: 'Golden', mutPrism: 'Prismatic', mutTitan: 'Titan',
      tapToStart: 'Tap to start', pause: 'Pause',
    },
  };
  KL.lang = 'id';
  KL.setLang = (l) => { KL.lang = STR[l] ? l : 'en'; document.documentElement.lang = KL.lang; };
  KL.t = (k, vars) => {
    let s = (STR[KL.lang] && STR[KL.lang][k]) || STR.en[k] || k;
    if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  KL.name = (o) => (o && (o[KL.lang] || o.en)) || '';

  // 1234 -> 1,234 ; 12345 -> 12.3K ; up to quintillions, then scientific
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  KL.fmt = (n) => {
    n = Math.floor(n);
    if (n < 10000) return n.toLocaleString('en-US');
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= SUF.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(1000, e);
    return (v < 100 ? v.toFixed(v < 10 ? 2 : 1) : Math.floor(v)) + SUF[e];
  };
  KL.fmtTime = (sec) => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h} ${KL.t('hours')} ${m} ${KL.t('minutes')}` : `${Math.max(1, m)} ${KL.t('minutes')}`;
  };
})(this);
