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
      trophy: 'Trofi', achievements: 'Pencapaian', activity: 'Aktivitas', share: 'Bagikan', shop: 'Toko', skins: 'Skin Gnome', boats: 'Kapal', shells: 'Kerang',
      tier0: 'Umum', tier1: 'Langka', tier2: 'Epik', tier3: 'Legendaris', tier4: 'Mitos',
      g_head: 'Seluruh laut', g_players: 'Nelayan gnome', g_fish: 'Ikan ditangkap semua orang', g_casts: 'Lemparan semua orang', g_deep: 'Terdalam di dunia', g_note: 'Gabungan semua pemain, diperbarui tiap beberapa menit. Game hanya mengirim angka tangkapan dengan ID acak.',
      orient: 'Layar', orAuto: 'Otomatis', orLand: 'Mendatar', orPort: 'Tegak', rotLand: 'Putar ponselmu ke posisi mendatar.', rotPort: 'Putar ponselmu ke posisi tegak.', rotAuto: 'Ikuti posisi ponsel',
      achUnlocked: 'Pencapaian terbuka', achMore: '+{n} pencapaian lain, lihat di Trofi', achHint: 'Tiap pencapaian memberi kerang: Umum 3, Langka 6, Epik 12, Legendaris 25, Mitos 50. Makin langka, makin sedikit yang bisa mendapatkannya.',
      wear: 'Pakai', worn: 'Dipakai', needZone: 'Capai {z}', needAch: 'Butuh: {a}', perksNow: 'Bonus aktif', noPerk: 'Tanpa bonus', bought: 'Terbeli',
      shopHint: 'Kerang didapat dari pencapaian, jenis ikan baru, menguasai ikan (250 dan 1000 tangkapan) dan musim baru. Satu skin dan satu kapal bisa dipakai bersamaan. Bonusnya aktif selama dipakai dan tetap milikmu di musim baru.',
      shareSub: 'Pamerkan progresmu', shareBtn: 'Bagikan', saveImg: 'Simpan gambar', whatsapp: 'WhatsApp', shareSaved: 'Gambar disimpan',
      shareHint: 'Instagram: simpan gambar, lalu unggah ke Story atau Feed. Di ponsel, tombol Bagikan membuka daftar aplikasi, termasuk Instagram dan WhatsApp.',
      shareText: 'Aku sudah menangkap {f} ikan dan menyelam sampai {d} m di Gnome, Line & Sinker!',
      shareHead: 'ikan sudah kutangkap', shareBest: 'Tangkapan terbaik', shareFoot: 'Main Gnome, Line & Sinker',
      st_play: 'Waktu bermain', st_fishing: 'Waktu memancing', st_casts: 'Lemparan', st_fish: 'Ikan ditangkap', st_junk: 'Sampah diangkat',
      st_species: 'Jenis ikan', st_variants: 'Varian', st_deep: 'Terdalam', st_metres: 'Total tali diturunkan', st_coins: 'Koin sepanjang masa',
      st_bestHaul: 'Tangkapan terbesar', st_haulFish: 'Ikan terbanyak sekali lempar', st_full: 'Peti penuh', st_gold: 'Ikan emas', st_prism: 'Ikan pelangi', st_titan: 'Ikan raksasa',
      st_boom: 'Ranjau meledak', st_sting: 'Tertusuk bulu babi', st_lost: 'Ikan lepas', st_moon: 'Malam purnama', st_days: 'Hari bermain', st_seasons: 'Musim dimulai',
      st_pearls: 'Mutiara', st_shells: 'Kerang', st_ach: 'Pencapaian', st_since: 'Main sejak', st_bestFish: 'Ikan terbaik', st_fav: 'Ikan paling sering',
      a_fish: 'Tangkap {n} ikan', a_casts: 'Lempar kail {n} kali', a_depth: 'Capai kedalaman {n} m', a_species: 'Temukan {n} jenis ikan', a_coins: 'Kumpulkan {n} koin sepanjang masa',
      a_junk: 'Angkat {n} sampah dari laut', a_sting: 'Tertusuk bulu babi {n}x', a_boom: 'Ledakkan {n} ranjau', a_gear: 'Beli {n} skin atau kapal', a_haulFish: 'Bawa {n} ikan dalam satu lemparan',
      a_full: 'Pulang dengan peti penuh {n}x', a_moon: 'Memancing di malam purnama {n}x', a_gold: 'Tangkap {n} ikan emas', a_prism: 'Tangkap {n} ikan pelangi', a_titan: 'Tangkap {n} ikan raksasa',
      a_time: 'Bermain selama {n}', a_days: 'Bermain di {n} hari berbeda', a_variants: 'Temukan {n} varian', a_seasons: 'Mulai {n} musim baru', a_pearls: 'Kumpulkan {n} mutiara',
      a_master: 'Kuasai {n} jenis ikan (1000 tangkapan)',
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
      trophy: 'Trophies', achievements: 'Achievements', activity: 'Activity', share: 'Share', shop: 'Shop', skins: 'Gnome Outfits', boats: 'Boats', shells: 'Shells',
      tier0: 'Common', tier1: 'Uncommon', tier2: 'Rare', tier3: 'Epic', tier4: 'Mythic',
      g_head: 'The whole sea', g_players: 'Gnome anglers', g_fish: 'Fish caught by everyone', g_casts: 'Casts by everyone', g_deep: 'Deepest anyone went', g_note: 'All players together, updated every few minutes. The game only sends catch counts under a random id.',
      orient: 'Screen', orAuto: 'Auto', orLand: 'Landscape', orPort: 'Portrait', rotLand: 'Turn your phone sideways.', rotPort: 'Turn your phone upright.', rotAuto: 'Follow the phone',
      achUnlocked: 'Achievement unlocked', achMore: '+{n} more, see Trophies', achHint: 'Every achievement pays shells: Common 3, Uncommon 6, Rare 12, Epic 25, Mythic 50. The rarer the tier, the fewer players ever get it.',
      wear: 'Wear', worn: 'Wearing', needZone: 'Reach {z}', needAch: 'Needs: {a}', perksNow: 'Active perks', noPerk: 'No perk', bought: 'Bought',
      shopHint: 'Shells come from achievements, new species, mastering a fish (250 and 1000 caught) and new seasons. Wear one outfit and one boat at a time. Perks work while worn, and you keep everything across seasons.',
      shareSub: 'Show off your progress', shareBtn: 'Share', saveImg: 'Save image', whatsapp: 'WhatsApp', shareSaved: 'Image saved',
      shareHint: 'Instagram: save the image, then post it to your Story or Feed. On phones the Share button opens your apps, Instagram and WhatsApp included.',
      shareText: 'I have caught {f} fish and dived to {d} m in Gnome, Line & Sinker!',
      shareHead: 'fish caught so far', shareBest: 'Best catch', shareFoot: 'Play Gnome, Line & Sinker',
      st_play: 'Time played', st_fishing: 'Time fishing', st_casts: 'Casts', st_fish: 'Fish caught', st_junk: 'Junk pulled up',
      st_species: 'Species', st_variants: 'Variants', st_deep: 'Deepest', st_metres: 'Line dropped in total', st_coins: 'Lifetime coins',
      st_bestHaul: 'Biggest haul', st_haulFish: 'Most fish in one cast', st_full: 'Full crates', st_gold: 'Golden fish', st_prism: 'Prismatic fish', st_titan: 'Titan fish',
      st_boom: 'Mines set off', st_sting: 'Urchin stings', st_lost: 'Fish lost', st_moon: 'Full moon nights', st_days: 'Days played', st_seasons: 'Seasons started',
      st_pearls: 'Pearls', st_shells: 'Shells', st_ach: 'Achievements', st_since: 'Playing since', st_bestFish: 'Best fish', st_fav: 'Most caught fish',
      a_fish: 'Catch {n} fish', a_casts: 'Cast {n} times', a_depth: 'Reach {n} m deep', a_species: 'Discover {n} species', a_coins: 'Earn {n} coins in total',
      a_junk: 'Pull {n} pieces of junk out of the sea', a_sting: 'Get stung by an urchin {n}x', a_boom: 'Set off {n} mines', a_gear: 'Buy {n} outfits or boats', a_haulFish: 'Bring up {n} fish in one cast',
      a_full: 'Come back with a full crate {n}x', a_moon: 'Fish under a full moon {n}x', a_gold: 'Catch {n} golden fish', a_prism: 'Catch {n} prismatic fish', a_titan: 'Catch {n} titan fish',
      a_time: 'Play for {n}', a_days: 'Play on {n} different days', a_variants: 'Find {n} variants', a_seasons: 'Start {n} new seasons', a_pearls: 'Earn {n} pearls',
      a_master: 'Master {n} species (1000 caught)',
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
