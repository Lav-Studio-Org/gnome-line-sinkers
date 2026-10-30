// Game data: zones, species, mutations, skill tree. Pure data, shared by the game,
// the tests and the balance simulation (node). Numbers here are tuned by scripts/balance.js.
(function (root) {
  'use strict';

  // Depth zones. `top` is where the zone starts (metres). Colours are flat steps, no gradients.
  const ZONES = [
    { id: 'muara',   top: 0,    name: { id: 'Muara', en: 'Estuary' },        water: '#3f8f8a', deep: '#2f7a78', dark: 0 },
    { id: 'terumbu', top: 30,   name: { id: 'Terumbu', en: 'Reef' },         water: '#2b7a93', deep: '#226a85', dark: 0 },
    { id: 'biru',    top: 90,   name: { id: 'Laut Biru', en: 'Open Blue' },  water: '#1f5c86', deep: '#194f78', dark: 0.12 },
    { id: 'senja',   top: 220,  name: { id: 'Zona Senja', en: 'Twilight' },  water: '#18406a', deep: '#14365c', dark: 0.38 },
    { id: 'palung',  top: 480,  name: { id: 'Palung', en: 'The Trench' },    water: '#111f3f', deep: '#0e1a36', dark: 0.62 },
    { id: 'jurang',  top: 1050, name: { id: 'Jurang Aneh', en: 'Weird Deep' }, water: '#1a1030', deep: '#150c28', dark: 0.78 },
  ];

  // Species. value = base coins. w = spawn weight. d = [min, max] depth. spd = swim speed (m/s).
  // rare: species counted as "rare" (boosted by the luck branch). shadow: uses the abyss recolour.
  const S = (id, sprite, nameId, nameEn, value, w, d0, d1, spd, extra) =>
    Object.assign({ id, sprite, name: { id: nameId, en: nameEn }, value, w, d: [d0, d1], spd }, extra || {});
  const SPECIES = [
    S('goldfish',  'goldfish',      'Ikan Mas',        'Goldfish',        1,     10, 2, 40, 4),
    S('anchovy',   'anchovy',       'Teri',            'Anchovy',         2,     8, 4, 45, 7),
    S('can',       'rusty_can',     'Kaleng Karatan',  'Rusty Can',       0.5,   2, 6, 60, 0.6, { junk: true }),
    S('bass',      'bass',          'Kakap Hijau',     'Green Bass',      4,     5, 10, 55, 4),
    S('trout',     'rainbow_trout', 'Trout Pelangi',   'Rainbow Trout',   9,     2, 16, 70, 5, { rare: true }),
    S('worm',      'worm',          'Cacing Laut',     'Sea Worm',        6,     1, 8, 50, 1.2, { rare: true }),
    S('clown',     'clownfish',     'Ikan Badut',      'Clownfish',       14,    8, 30, 100, 4),
    S('kelp',      'kelp',          'Rumput Laut',     'Kelp Clump',      4,     2, 30, 120, 0.5, { junk: true }),
    S('surgeon',   'surgeonfish',   'Botana Biru',     'Blue Tang',       20,    6, 34, 110, 5),
    S('angel',     'angelfish',     'Ikan Bidadari',   'Angelfish',       30,    4, 45, 130, 3.5),
    S('puffer',    'pufferfish',    'Buntal',          'Pufferfish',      46,    2.5, 55, 150, 2.5, { puffer: true }),
    S('crab',      'crab',          'Kepiting',        'Crab',            70,    1.4, 60, 170, 2, { rare: true }),
    S('sardine',   'sardine',       'Sarden',          'Sardine',         85,    9, 90, 230, 8),
    S('silver',    'silverfish',    'Belanak Perak',   'Silver Mullet',   115,   7, 95, 250, 6),
    S('striped',   'striped',       'Kerapu Loreng',   'Striped Grouper', 160,   5, 110, 280, 4),
    S('catfish',   'catfish',       'Manyung',         'Sea Catfish',     210,   3, 130, 300, 3),
    S('white',     'whitefish',     'Kakap Putih',     'Barramundi',      270,   3, 140, 320, 5),
    S('rainbow',   'rainbowfish',   'Ikan Pelangi',    'Rainbowfish',     420,   1.3, 150, 340, 6, { rare: true }),
    S('shrimp',    'shrimp',        'Udang Kipas',     'Fan Shrimp',      520,   8, 220, 520, 3),
    S('lantern',   'lanternfish',   'Ikan Lentera',    'Lanternfish',     700,   6, 230, 560, 5, { glow: '#8ff7ff' }),
    S('jelly',     'jellyfish',     'Ubur-ubur',       'Jellyfish',       900,   5, 240, 600, 1.4, { glow: '#ffc2f0' }),
    S('squid',     'squid',         'Cumi Kilat',      'Flash Squid',     1250,  3, 260, 620, 7),
    S('scallop',   'scallop',       'Kerang Mutiara',  'Pearl Scallop',   1800,  1.2, 280, 650, 0.8, { rare: true }),
    S('eel',       'eel',           'Sidat Lumpur',    'Mud Eel',         2400,  7, 480, 1150, 4),
    S('redcrab',   'redcrab',       'Rajungan Api',    'Fire Crab',       3300,  5, 500, 1200, 2),
    S('angler',    'angler',        'Ikan Pemancing',  'Anglerfish',      4600,  4, 520, 1250, 2.5, { glow: '#ffe58a' }),
    S('koi',       'koi',           'Koi Purba',       'Ancient Koi',     6800,  2, 560, 1300, 3),
    S('coela',     'coelacanth',    'Raja Laut',       'Coelacanth',      11000, 1, 600, 1350, 2.5, { rare: true }),
    S('s_gold',    'goldfish',      'Ikan Mas Bermata Tiga', 'Three-Eyed Goldfish', 16000, 6, 1050, 99999, 5, { shadow: true }),
    S('s_clown',   'clownfish',     'Badut Bayangan',  'Shadow Clown',    24000, 5, 1080, 99999, 5, { shadow: true }),
    S('s_puffer',  'pufferfish',    'Buntal Bulan',    'Moon Puffer',     36000, 4, 1120, 99999, 3, { shadow: true, puffer: true }),
    S('s_jelly',   'jellyfish',     'Ubur-ubur Hampa', 'Void Jelly',      52000, 3, 1180, 99999, 2, { shadow: true, glow: '#7af0ff' }),
    S('s_coela',   'coelacanth',    'Penjaga Jurang',  'Deep Warden',     95000, 1, 1250, 99999, 2.5, { shadow: true, rare: true }),
  ];

  // Mutations roll per fish when it spawns. chance is per fish before luck bonuses.
  const MUTATIONS = [
    { id: 'big',    name: { id: 'Besar', en: 'Big' },          mult: 2,  chance: 0.05,   scale: 2 },
    { id: 'gold',   name: { id: 'Emas', en: 'Golden' },        mult: 5,  chance: 0.012,  scale: 1 },
    { id: 'prism',  name: { id: 'Pelangi', en: 'Prismatic' },  mult: 15, chance: 0.0025, scale: 1 },
    { id: 'titan',  name: { id: 'Raksasa', en: 'Titan' },      mult: 40, chance: 0.0005, scale: 3 },
  ];

  // Skill tree. Grid positions (x, y) in node units; root at 0,0.
  // fx: effect key, v: value per level. req: parent ids (any one bought reveals + allows buying).
  // cost(lv) = c * g^lv. cur: 'coin' | 'pearl'.
  const N = (id, x, y, req, icon, nameId, nameEn, descId, descEn, max, c, g, fx, v, extra) =>
    Object.assign({ id, x, y, req, icon, name: { id: nameId, en: nameEn }, desc: { id: descId, en: descEn }, max, c, g, fx, v, cur: 'coin' }, extra || {});
  const NODES = [
    N('root', 0, 0, [], 'hook', 'Kail Bambu', 'Bamboo Rod', 'Awal segalanya. Tali 20 m, muat 2 ikan.', 'Where it all begins. 20 m line, holds 2 fish.', 1, 0, 1, null, 0),

    // LINE (right): depth
    N('line1', 1, 0, ['root'], 'rope', 'Tali Lebih Panjang', 'Longer Line', '+12 m panjang tali.', '+12 m line length.', 5, 0.3, 1.6, 'line', 12, { t: 0 }),
    N('sink1', 2, 1, ['line1'], 'weight', 'Pemberat Timah', 'Lead Sinker', 'Kail turun 20% lebih cepat.', 'Hook sinks 20% faster.', 5, 0.15, 1.9, 'sink', 0.2, { t: 1 }),
    N('line2', 2, 0, ['line1'], 'rope', 'Gulungan Nilon', 'Nylon Spool', '+35 m panjang tali.', '+35 m line length.', 5, 1, 3.5, 'line', 35, { t: 1 }),
    N('fall1', 3, 1, ['line2', 'sink1'], 'bolt', 'Jatuh Bebas', 'Free Fall', 'Bagian awal tali meluncur cepat tanpa tabrakan.', 'The first part of the drop is fast and cannot be blocked.', 4, 0.5, 2.6, 'fall', 0.16, { t: 2 }),
    N('line3', 3, 0, ['line2'], 'rope', 'Senar Baja', 'Steel Wire', '+80 m panjang tali.', '+80 m line length.', 5, 1, 3.5, 'line', 80, { t: 2 }),
    N('sink2', 4, 1, ['line3'], 'weight', 'Jangkar Mini', 'Pocket Anchor', 'Kail turun 30% lebih cepat lagi.', 'Hook sinks another 30% faster.', 4, 0.5, 2.5, 'sink', 0.3, { t: 3 }),
    N('line4', 4, 0, ['line3'], 'rope', 'Kabel Laut Dalam', 'Deep Sea Cable', '+180 m panjang tali.', '+180 m line length.', 5, 1, 3.5, 'line', 180, { t: 3 }),
    N('line5', 5, 0, ['line4'], 'rope', 'Tali Tak Berujung', 'Endless Line', '+400 m panjang tali.', '+400 m line length.', 20, 1, 3, 'line', 400, { t: 4 }),

    // HOOK (upper right): capacity, reach
    N('cap1', 1, -1, ['root'], 'hooks', 'Kail Ganda', 'Double Hook', '+1 ikan per lemparan.', '+1 fish per cast.', 5, 0.5, 1.8, 'cap', 1, { t: 0 }),
    N('reach1', 1, -2, ['cap1'], 'magnet', 'Umpan Wangi', 'Fragrant Bait', 'Jangkauan kail +20%.', 'Hook reach +20%.', 5, 2, 2, 'reach', 0.2, { t: 0 }),
    N('cap2', 2, -2, ['cap1'], 'hooks', 'Kail Rantai', 'Chain Hooks', '+2 ikan per lemparan.', '+2 fish per cast.', 5, 2, 2.4, 'cap', 2, { t: 1 }),
    N('song', 2, -3, ['reach1', 'cap2'], 'note', 'Lagu untuk Ikan', 'A Song for Fish', 'Ikan di dekat kail berenang mendekat saat naik.', 'Nearby fish swim toward the hook on the way up.', 3, 1, 3, 'song', 1, { t: 2 }),
    N('cap3', 3, -3, ['cap2'], 'net', 'Jaring Kecil', 'Little Net', '+4 ikan per lemparan.', '+4 fish per cast.', 5, 3, 2.4, 'cap', 4, { t: 2 }),
    N('twin', 3, -4, ['cap3'], 'twin', 'Tangkapan Kembar', 'Twin Catch', '5% peluang tiap ikan dihitung dua kali.', '5% chance each fish counts twice.', 5, 2, 2.5, 'twin', 0.05, { t: 3 }),
    N('cap4', 4, -4, ['cap3'], 'net', 'Pukat Raksasa', 'Giant Trawl', '+10 ikan per lemparan.', '+10 fish per cast.', 10, 1, 3.2, 'cap', 10, { t: 4 }),

    // MARKET (upper left): value
    N('val1', -1, -1, ['root'], 'coin', 'Lapak Pasar', 'Market Stall', 'Nilai ikan +25%.', 'Fish value +25%.', 10, 0.6, 1.6, 'value', 0.25, { t: 0 }),
    N('junk', -2, -1, ['val1'], 'recycle', 'Daur Ulang', 'Recycling', 'Sampah bernilai 5x lipat.', 'Junk is worth 5x more.', 3, 4, 3, 'junk', 4, { t: 0 }),
    N('full', -1, -2, ['val1'], 'crate', 'Peti Penuh', 'Full Crate', 'Pulang dengan kail penuh: +15% hasil.', 'Come back full: +15% haul.', 5, 1, 2.1, 'full', 0.15, { t: 1 }),
    N('val2', -2, -2, ['val1'], 'chef', 'Juru Masak', 'Head Chef', 'Nilai ikan +60%.', 'Fish value +60%.', 10, 8, 1.8, 'value', 0.6, { t: 1 }),
    N('bulk', -2, -3, ['val2', 'full'], 'stack', 'Borongan', 'Bulk Order', 'Tiap ikan dalam satu lemparan: +1% hasil.', 'Each fish in a cast: +1% haul.', 5, 2, 2.4, 'bulk', 0.01, { t: 2 }),
    N('val3', -3, -3, ['val2'], 'shop', 'Restoran Kota', 'City Restaurant', 'Nilai ikan x1.5.', 'Fish value x1.5.', 6, 1, 2.8, 'valx', 0.5, { t: 3 }),
    N('val4', -4, -4, ['val3'], 'crown', 'Pesanan Istana', 'Palace Orders', 'Nilai ikan x1.5.', 'Fish value x1.5.', 5, 3, 6, 'valx', 0.5, { t: 4 }),

    // POND (left): idle income
    N('pond1', -1, 0, ['root'], 'pond', 'Keramba', 'Fish Pen', 'Ikan koleksimu menghasilkan koin, bahkan saat kamu pergi.', 'Your collection earns coins, even while you are away.', 1, 0.5, 1, 'pond', 1, { t: 1 }),
    N('pond2', -2, 0, ['pond1'], 'pond', 'Kolam Lebar', 'Wider Pond', 'Pendapatan keramba +40%.', 'Pen income +40%.', 8, 3, 2, 'pondmul', 0.4, { t: 1 }),
    N('night', -3, -1, ['pond2'], 'moon', 'Penjaga Malam', 'Night Keeper', '+2 jam batas pendapatan saat offline.', '+2 h offline income limit.', 5, 6, 2.2, 'offline', 2, { t: 1 }),
    N('cat', -4, -1, ['night', 'pond3'], 'cat', 'Kucing Kapal', 'Ship Cat', 'Kucing kadang membawa ikan terbaikmu sekali lagi.', 'The cat sometimes brings your best fish again.', 3, 2, 3, 'cat', 0.2, { t: 2 }),
    N('pond3', -3, 0, ['pond2'], 'pond', 'Akuarium Kota', 'City Aquarium', 'Pendapatan keramba x1.6.', 'Pen income x1.6.', 4, 1, 3, 'pondx', 0.6, { t: 3 }),
    N('pond4', -4, 0, ['pond3'], 'pond', 'Laut Pribadi', 'Private Sea', 'Pendapatan keramba x2.', 'Pen income x2.', 3, 2, 3.5, 'pondx', 1, { t: 4 }),

    // LUCK (lower left): mutations, rares
    N('luck1', -1, 1, ['root'], 'clover', 'Jimat Keberuntungan', 'Lucky Charm', 'Peluang mutasi +25%.', 'Mutation chance +25%.', 8, 3, 1.75, 'mut', 0.25, { t: 0 }),
    N('eye', -1, 2, ['luck1'], 'eye', 'Mata Elang', 'Hawk Eye', 'Ikan langka muncul 30% lebih sering.', 'Rare fish appear 30% more often.', 5, 1.5, 2, 'rare', 0.3, { t: 1 }),
    N('goldsc', -2, 2, ['eye'], 'scale', 'Sisik Emas', 'Golden Scales', 'Ikan bermutasi +40% nilai.', 'Mutated fish +40% value.', 5, 0.4, 2.2, 'mutval', 0.4, { t: 2 }),
    N('sonar', -2, 1, ['eye'], 'sonar', 'Sonar', 'Sonar', 'Penanda ikan langka di penggaris kedalaman.', 'Rare fish marks on the depth ruler.', 1, 0.5, 1, 'sonar', 1, { t: 2 }),
    N('moon', -2, 3, ['goldsc', 'sonar'], 'moon', 'Malam Purnama', 'Full Moon', 'Tiap beberapa lemparan: malam purnama, mutasi x3.', 'Every few casts: full moon night, mutations x3.', 4, 4, 2.8, 'moon', 1, { t: 2 }),
    N('luck2', -3, 3, ['moon'], 'clover', 'Semanggi Empat', 'Four-Leaf Clover', 'Peluang mutasi +60%.', 'Mutation chance +60%.', 10, 3, 2.5, 'mut', 0.6, { t: 3 }),

    // CONTROL (lower right): speed, guard, autopilot
    N('reel1', 1, 1, ['root'], 'reel', 'Gulungan Cepat', 'Quick Reel', 'Tarik ke atas 20% lebih cepat.', 'Reel up 20% faster.', 5, 0.7, 1.8, 'reel', 0.2, { t: 0 }),
    N('guard', 1, 2, ['reel1'], 'shield', 'Pelindung Kail', 'Hook Guard', 'Tembus 1 ikan saat turun.', 'Pass through 1 fish on the way down.', 5, 6, 2.5, 'guard', 1, { t: 0 }),
    N('steer', 2, 2, ['reel1', 'guard'], 'steer', 'Kemudi Halus', 'Smooth Steering', 'Kail bergeser 20% lebih gesit.', 'Hook moves sideways 20% faster.', 4, 0.8, 2, 'steer', 0.2, { t: 1 }),
    N('auto', 1, 3, ['guard'], 'robot', 'Nelayan Otomatis', 'Auto Angler', 'Memancing sendiri. Level naik = makin jago.', 'Fishes on its own. More levels = more skill.', 3, 8, 5, 'auto', 1, { t: 1 }),
    N('reel2', 2, 3, ['steer', 'auto'], 'reel', 'Motor Tempel', 'Outboard Motor', 'Tarik ke atas 40% lebih cepat lagi.', 'Reel up another 40% faster.', 5, 0.3, 2.2, 'reel', 0.4, { t: 3 }),
    N('slow', 3, 2, ['steer'], 'timer', 'Fokus', 'Focus', 'Waktu melambat sesaat sebelum menabrak ikan.', 'Time slows just before you hit a fish.', 3, 3, 2.6, 'slow', 1, { t: 2 }),

    // PEARL nodes (outer ring, bought with pearls from a new season)
    N('p_value', -5, -5, ['root'], 'pearl', 'Kilau Mutiara', 'Pearl Shine', 'Tiap mutiara memberi +2% nilai lagi.', 'Each pearl gives another +2% value.', 5, 3, 1.8, 'pearlval', 0.02, { cur: 'pearl' }),
    N('p_line', 6, 0, ['root'], 'pearl', 'Warisan Tali', 'Inherited Line', 'Mulai musim dengan +60 m tali.', 'Start each season with +60 m of line.', 5, 2, 1.7, 'line', 60, { cur: 'pearl' }),
    N('p_cap', 5, -5, ['root'], 'pearl', 'Kail Pusaka', 'Heirloom Hooks', '+3 ikan per lemparan.', '+3 fish per cast.', 5, 2, 1.7, 'cap', 3, { cur: 'pearl' }),
    N('p_auto', 3, 4, ['root'], 'pearl', 'Awak Setia', 'Loyal Crew', 'Nelayan otomatis langsung aktif dan lebih jago.', 'Auto angler is ready from the start and sharper.', 1, 5, 1, 'pauto', 1, { cur: 'pearl' }),
    N('p_luck', -4, 4, ['root'], 'pearl', 'Laut Ajaib', 'Enchanted Sea', 'Peluang mutasi x1.5.', 'Mutation chance x1.5.', 4, 3, 2, 'mutx', 0.5, { cur: 'pearl' }),
    N('p_pond', -5, 0, ['root'], 'pearl', 'Mata Air', 'Hidden Spring', 'Pendapatan keramba x1.5.', 'Pen income x1.5.', 4, 3, 2, 'pondx', 0.5, { cur: 'pearl' }),
  ];

  // Cost of a node = TIER[t] * c * g^level. TIER is roughly "15 casts of income" at the start of
  // each zone; scripts/balance.js --tune fits it to the pacing targets in docs/BALANCE.md.
  const TIER = [30, 650, 400000, 120000000, 6000000000, 300000000000];
  NODES.forEach((n) => { if (n.t != null) n.k = n.c; });
  function applyTier(T) {
    T.forEach((v, i) => { TIER[i] = v; });
    NODES.forEach((n) => { if (n.t != null) n.c = n.k * TIER[n.t]; });
  }
  applyTier(TIER);

  const MASTERY = [10, 50, 250, 1000]; // catches per species; each step: +25% for that species

  const D = { ZONES, SPECIES, MUTATIONS, NODES, MASTERY, TIER, applyTier };
  if (typeof module !== 'undefined') module.exports = D; else (root.KL = root.KL || {}).DATA = D;
})(this);
