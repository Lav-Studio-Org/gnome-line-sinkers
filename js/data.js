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
    // 80+ Fishing Icons pack (Moranovo)
    S('minnow',    'mo_minnow',     'Ikan Wader',      'Minnow',          1.5,   6, 2, 35, 6),
    S('stickle',   'mo_stickleback','Ikan Duri',       'Stickleback',     2.5,   4, 4, 40, 5),
    S('tilapia',   'mo_tilapia',    'Nila',            'Tilapia',         3,     5, 3, 45, 3.5),
    S('snail',     'mo_snail',      'Keong Sungai',    'River Snail',     1.2,   1.5, 3, 40, 0.3, { junk: true }),
    S('bottle',    'mo_bottle',     'Botol Plastik',   'Plastic Bottle',  0.4,   2, 2, 70, 0.4, { junk: true }),
    S('sunfish',   'mo_sunfish',    'Ikan Mentari',    'Green Sunfish',   4.5,   4, 8, 50, 4),
    S('prawn',     'mo_prawn',      'Udang Galah',     'River Prawn',     6,     1.2, 6, 45, 2, { rare: true }),
    S('snapper',   'mo_snapper',    'Kakap Merah',     'Red Snapper',     8,     3, 12, 60, 4),
    S('tetra',     'mo_tetra',      'Ikan Neon',       'Neon Tetra',      16,    6, 30, 95, 6),
    S('guppy',     'mo_guppy',      'Gupi Ekor Kipas', 'Fan-tail Guppy',  18,    5, 30, 90, 5),
    S('ytang',     'mo_ytang',      'Botana Kuning',   'Yellow Tang',     24,    5, 32, 110, 5),
    S('rstar',     'mo_rstar',      'Bintang Laut',    'Red Starfish',    28,    2, 35, 120, 0.3),
    S('hermit',    'mo_hermit',     'Kelomang',        'Hermit Crab',     34,    2, 40, 130, 1),
    S('seahorse',  'mo_seahorse',   'Kuda Laut',       'Seahorse',        48,    1.2, 35, 110, 1, { rare: true }),
    S('coral',     'mo_coral',      'Patahan Karang',  'Coral Bit',       8,     1.5, 30, 140, 0.3, { junk: true }),
    S('octopus',   'mo_octopus',    'Gurita',          'Octopus',         66,    1, 60, 170, 2, { rare: true }),
    S('saury',     'mo_saury',      'Ikan Saury',      'Pacific Saury',   95,    6, 90, 230, 8),
    S('mackerel',  'mo_mackerel',   'Tenggiri',        'Spanish Mackerel',100,   7, 90, 240, 8),
    S('croaker',   'mo_croaker',    'Gulama Kuning',   'Yellow Croaker',  125,   5, 100, 260, 4),
    S('flying',    'mo_flying',     'Ikan Terbang',    'Flying Fish',     140,   4, 95, 240, 10),
    S('cod',       'mo_cod',        'Ikan Kod',        'Cod',             180,   4, 110, 280, 3.5),
    S('tuna',      'mo_tuna',       'Tuna Sirip Biru', 'Bluefin Tuna',    190,   4, 105, 270, 9),
    S('salmon',    'mo_salmon',     'Salmon',          'Salmon',          230,   3, 120, 290, 6),
    S('pomfret',   'mo_pomfret',    'Bawal Putih',     'Silver Pomfret',  240,   3, 130, 300, 4),
    S('turbot',    'mo_turbot',     'Ikan Sebelah',    'Turbot',          260,   2, 140, 330, 1.5),
    S('grouper',   'mo_grouper',    'Kerapu Sunu',     'Coral Grouper',   320,   2.5, 120, 300, 3),
    S('lobster',   'mo_lobster',    'Lobster Batu',    'Rock Lobster',    360,   1.3, 150, 340, 2, { rare: true }),
    S('gpomfret',  'mo_gpomfret',   'Bawal Emas',      'Golden Pomfret',  380,   1.2, 140, 320, 4, { rare: true }),
    S('hairtail',  'mo_hairtail',   'Ikan Layur',      'Hairtail',        600,   7, 220, 520, 6),
    S('batfish',   'mo_batfish',    'Ikan Kelelawar',  'Batfish',         760,   4, 230, 540, 3),
    S('vstar',     'mo_vstar',      'Bintang Laut Ungu', 'Violet Starfish', 900, 2, 240, 560, 0.3, { glow: '#d6b8ff' }),
    S('stingray',  'mo_stingray',   'Pari Totol',      'Spotted Stingray', 1000, 3, 240, 580, 3),
    S('ray',       'mo_ray',        'Pari Oranye',     'Orange Ray',      1150,  2.5, 250, 600, 3),
    S('cucumber',  'mo_cucumber',   'Teripang Emas',   'Golden Sea Cucumber', 1400, 1, 260, 640, 0.3, { rare: true }),
    S('abalone',   'mo_abalone',    'Abalon',          'Abalone',         1600,  1, 280, 660, 0.2, { rare: true }),
    S('manta',     'mo_manta',      'Pari Manta',      'Manta Ray',       1700,  1.5, 300, 700, 4),
    S('snake',     'mo_snake',      'Ular Laut',       'Sea Snake',       2700,  5, 490, 1150, 4),
    S('eeel',      'mo_eeel',       'Belut Listrik',   'Electric Eel',    3000,  5, 480, 1150, 4, { glow: '#8fdcff' }),
    S('bcucumber', 'mo_bcucumber',  'Teripang Hitam',  'Black Sea Cucumber', 4000, 2, 520, 1200, 0.3),
    S('blob',      'mo_blob',       'Ikan Gumpal',     'Blobfish',        5200,  3, 540, 1250, 1),
    S('vangler',   'mo_angler',     'Pemancing Ungu',  'Violet Angler',   7600,  2, 580, 1300, 2, { glow: '#ff8ad8' }),
    S('oranda',    'mo_oranda',     'Oranda Topi Merah', 'Red-cap Oranda', 9000, 1, 620, 1350, 2.5, { rare: true }),
    S('turtle',    'mo_turtle',     'Labi-labi Tua',   'Old Softshell Turtle', 12500, 0.8, 650, 1400, 1.5, { rare: true }),
    S('s_blob',    'mo_blob',       'Gumpal Hampa',    'Hollow Blob',     30000, 4, 1100, 99999, 1, { shadow: true }),
    S('s_horse',   'mo_seahorse',   'Kuda Laut Bintang', 'Star Seahorse', 44000, 3, 1150, 99999, 1.5, { shadow: true, glow: '#7af0ff' }),
    S('s_manta',   'mo_manta',      'Manta Malam',     'Night Manta',     68000, 2, 1300, 99999, 4, { shadow: true, rare: true }),
    S('s_gold',    'goldfish',      'Ikan Mas Bermata Tiga', 'Three-Eyed Goldfish', 16000, 6, 1050, 99999, 5, { shadow: true }),
    S('s_clown',   'clownfish',     'Badut Bayangan',  'Shadow Clown',    24000, 5, 1080, 99999, 5, { shadow: true }),
    S('s_puffer',  'pufferfish',    'Buntal Bulan',    'Moon Puffer',     36000, 4, 1120, 99999, 3, { shadow: true, puffer: true }),
    S('s_jelly',   'jellyfish',     'Ubur-ubur Hampa', 'Void Jelly',      52000, 3, 1180, 99999, 2, { shadow: true, glow: '#7af0ff' }),
    S('s_coela',   'coelacanth',    'Penjaga Jurang',  'Deep Warden',     95000, 1, 1250, 99999, 2.5, { shadow: true, rare: true }),

    // zone guardians (see BOSSES): never spawn as normal fish, only in a boss fight
    S('b_catfish', 'catfish',       'Lele Raja',       'King Catfish',    160,    0, 26, 26, 5, { boss: true }),
    S('b_grouper', 'mo_grouper',    'Kerapu Karang Tua', 'Old Reef Grouper', 2200, 0, 86, 86, 7, { boss: true }),
    S('b_tuna',    'mo_tuna',       'Tuna Kilat',      'Lightning Tuna',  30000,  0, 214, 214, 11, { boss: true }),
    S('b_manta',   'mo_manta',      'Manta Bayangan',  'Shadow Manta',    6e5,    0, 472, 472, 9, { boss: true, glow: '#8ff7ff' }),
    S('b_angler',  'mo_angler',     'Pemancing Purba', 'Elder Angler',    1.6e7,  0, 1040, 1040, 8, { boss: true, glow: '#ff8ad8' }),
  ];

  // Mutations roll per fish when it spawns. chance is per fish before luck bonuses.
  const MUTATIONS = [
    { id: 'big',    name: { id: 'Besar', en: 'Big' },          mult: 2,  chance: 0.05,   scale: 2 },
    { id: 'gold',   name: { id: 'Emas', en: 'Golden' },        mult: 5,  chance: 0.012,  scale: 1 },
    { id: 'prism',  name: { id: 'Pelangi', en: 'Prismatic' },  mult: 15, chance: 0.0025, scale: 1 },
    { id: 'titan',  name: { id: 'Raksasa', en: 'Titan' },      mult: 40, chance: 0.0005, scale: 3 },
  ];

  // Zone guardians. Each sits in an arena a few metres above the zone it guards; until it is
  // beaten the line cannot go past it, and reaching the arena starts the fight. y: arena depth,
  // hp: stamina in reel-metres (drained by reeling while you pull against its run), spd: how fast
  // it swims sideways (m/s), pull: line it takes per second while running free, as a share of
  // its depth (so the slack you need grows with the arena), turn: seconds between runs [min, max],
  // moves: what it can do on a turn (run: change direction, dash: a short burst at 1.8x,
  // dive: pulls down 6 m, feint: flashes but keeps going). shells: paid once, on the first win.
  const BOSSES = [
    { id: 'b_catfish', zone: 1, y: 26,   hp: 70,   spd: 6,  pull: 0.12, turn: [1.6, 2.6], moves: ['run'],                         shells: 10 },
    { id: 'b_grouper', zone: 2, y: 86,   hp: 300,  spd: 8,  pull: 0.1, turn: [1.3, 2.2], moves: ['run', 'run', 'dash'],          shells: 15 },
    { id: 'b_tuna',    zone: 3, y: 214,  hp: 600,  spd: 12, pull: 0.08, turn: [1.0, 1.8], moves: ['run', 'dash', 'dash'],         shells: 25 },
    { id: 'b_manta',   zone: 4, y: 472,  hp: 1200, spd: 10, pull: 0.08, turn: [1.0, 1.7], moves: ['run', 'dash', 'dive'],         shells: 40 },
    { id: 'b_angler',  zone: 5, y: 1040, hp: 1900, spd: 11, pull: 0.07, turn: [0.8, 1.5], moves: ['run', 'dash', 'dive', 'feint'], shells: 60 },
  ];

  // Cast conditions: the dock shows the next cast's conditions, so they are a forecast.
  // Time of day turns every 3 casts; weather holds for 4 casts. Effects are multipliers.
  //   dens: fish density, rare: rare species weight, glow: glowing species weight,
  //   mut: mutation chance, spd: fish speed, val: value of the haul, cur: current strength
  const TIMES = [
    { id: 'pagi',  icon: 'sun',  name: { id: 'Pagi', en: 'Morning' }, fx: { shallow: 1.3 },
      info: { id: 'Ikan ramai di dekat permukaan (+30% ikan di atas 90 m).', en: 'Fish crowd near the surface (+30% fish above 90 m).' } },
    { id: 'siang', icon: 'sun',  name: { id: 'Siang', en: 'Midday' }, fx: { reel: 1.1 },
      info: { id: 'Air jernih: tarik ke atas 10% lebih cepat.', en: 'Clear water: reel up 10% faster.' } },
    { id: 'senja', icon: 'dusk', name: { id: 'Senja', en: 'Dusk' },   fx: { rare: 1.6 },
      info: { id: 'Jam makan: ikan langka 60% lebih sering.', en: 'Feeding time: rare fish 60% more often.' } },
    { id: 'malam', icon: 'moon', name: { id: 'Malam', en: 'Night' },  fx: { glow: 2.2, mut: 1.4 },
      info: { id: 'Ikan bercahaya 2x lebih sering, mutasi +40%.', en: 'Glowing fish 2x as common, mutations +40%.' } },
  ];
  const WEATHERS = [
    { id: 'cerah', icon: 'sun',   w: 60, name: { id: 'Cerah', en: 'Clear' }, fx: {},
      info: { id: 'Laut tenang.', en: 'Calm sea.' } },
    { id: 'hujan', icon: 'rain',  w: 28, name: { id: 'Hujan', en: 'Rain' },  fx: { dens: 1.2, spd: 1.25 },
      info: { id: 'Ikan lebih banyak (+20%) tapi lebih gesit.', en: 'More fish (+20%), but they swim faster.' } },
    { id: 'badai', icon: 'storm', w: 12, name: { id: 'Badai', en: 'Storm' }, fx: { val: 1.5, cur: 1.8, curMore: 1 },
      info: { id: 'Tangkapan +50% koin, tapi arus jauh lebih kuat dan sering (memakan tali).', en: 'Haul +50% coins, but currents are much stronger and more common (they eat line).' } },
  ];
  // Bait: picked at the dock, free, a side-grade. Each one bends what bites.
  const BAITS = [
    { id: 'cacing', zone: 0, icon: 'worm',  name: { id: 'Cacing', en: 'Worm' },        fx: {},
      info: { id: 'Umpan biasa, semua ikan mau.', en: 'Plain bait, everything bites.' } },
    { id: 'pelet',  zone: 1, icon: 'pellet', name: { id: 'Pelet', en: 'Pellets' },     fx: { dens: 1.35, rare: 0.6 },
      info: { id: '+35% ikan, tapi ikan langka lebih jarang. Cocok untuk memenuhi peti.', en: '+35% fish, but fewer rare ones. Good for filling the crate.' } },
    { id: 'udang',  zone: 2, icon: 'shrimp', name: { id: 'Udang', en: 'Shrimp' },      fx: { rare: 1.8, dens: 0.75 },
      info: { id: 'Ikan langka 80% lebih sering, tapi ikan 25% lebih sedikit.', en: 'Rare fish 80% more often, but 25% fewer fish.' } },
    { id: 'lampu',  zone: 3, icon: 'lure',   name: { id: 'Umpan Lampu', en: 'Glow Lure' }, fx: { glow: 2.5, mut: 1.25, shallow: 0.6 },
      info: { id: 'Ikan bercahaya 2.5x, mutasi +25%, tapi ikan dangkal kabur (-40% di atas 90 m).', en: 'Glowing fish 2.5x, mutations +25%, but shallow fish flee (-40% above 90 m).' } },
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
    N('steer', 2, 2, ['reel1', 'guard'], 'steer', 'Kemudi Halus', 'Smooth Steering', 'Kail bergeser 20% lebih gesit dan geser ke samping memakan tali 10% lebih hemat.', 'Hook moves sideways 20% faster, and side moves use 10% less line.', 4, 0.8, 2, 'steer', 0.2, { t: 1 }),
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
  const TIER = [50, 750, 1500000, 570000000, 29000000000, 1500000000000];
  NODES.forEach((n) => { if (n.t != null) n.k = n.c; });
  function applyTier(T) {
    T.forEach((v, i) => { TIER[i] = v; });
    NODES.forEach((n) => { if (n.t != null) n.c = n.k * TIER[n.t]; });
  }
  applyTier(TIER);


  // Achievements, from easy to very rare. tier 0..4 = Umum/Common .. Mitos/Mythic; each pays
  // SHELL_PAY[tier] shells. k is the stat it reads (engine achValue), goal the target.
  // Names and descriptions live here so the share card and the trophy screen read the same data.
  const A = (id, tier, icon, k, goal, nameId, nameEn) => ({ id, tier, icon, k, goal, name: { id: nameId, en: nameEn } });
  const ACH = [
    A('fish1',     0, 'fish',    'fish',     1,     'Gigitan Pertama',     'First Bite'),
    A('cast10',    0, 'hook',    'casts',    10,    'Mulai Terbiasa',      'Getting the Hang of It'),
    A('fish100',   0, 'fish',    'fish',     100,   'Ember Penuh',         'Full Bucket'),
    A('reef',      0, 'wave',    'depth',    30,    'Halo, Terumbu',       'Hello, Reef'),
    A('boss1',     1, 'crown',   'boss',     1,     'Penjaga Pertama',     'First Guardian'),
    A('storm10',   1, 'bolt',    'storm',    10,    'Pelaut Badai',        'Storm Sailor'),
    A('sp10',      0, 'book',    'species',  10,    'Pencatat Ikan',       'Fish Notes'),
    A('coin1k',    0, 'coin',    'coins',    1e3,   'Uang Jajan',          'Pocket Money'),
    A('junk10',    0, 'recycle', 'junk',     10,    'Pembersih Laut',      'Sea Sweeper'),
    A('sting1',    0, 'help',    'sting',    1,     'Aduh, Bulu Babi',     'Ouch, Urchin'),
    A('boom1',     0, 'bolt',    'boom',     1,     'Kejutan Ranjau',      'Surprise Mine'),
    A('gear1',     0, 'shop',    'gear',     1,     'Gaya Baru',           'New Look'),

    A('fish1k',    1, 'fish',    'fish',     1000,  'Nelayan Sungguhan',   'Real Angler'),
    A('cast250',   1, 'hook',    'casts',    250,   'Lengan Kuat',         'Strong Arm'),
    A('blue',      1, 'wave',    'depth',    90,    'Laut Lepas',          'Open Water'),
    A('dusk',      1, 'moon',    'depth',    220,   'Cahaya Terakhir',     'Last Light'),
    A('sp25',      1, 'book',    'species',  25,    'Kolektor',            'Collector'),
    A('coin1m',    1, 'coin',    'coins',    1e6,   'Jutawan Pantai',      'Beach Millionaire'),
    A('haul10',    1, 'stack',   'haulFish', 10,    'Satu Kail Sepuluh',   'Ten on a Line'),
    A('full25',    1, 'crate',   'full',     25,    'Peti Selalu Penuh',   'Always Full'),
    A('moon1',     1, 'moon',    'moon',     1,     'Malam Purnama',       'Full Moon'),
    A('gold1',     1, 'coin',    'gold',     1,     'Sisik Emas',          'Golden Scales'),
    A('time1h',    1, 'timer',   'time',     3600,  'Satu Jam di Laut',    'An Hour at Sea'),
    A('days3',     1, 'sparkle', 'days',     3,     'Balik Lagi',          'Back Again'),
    A('var50',     1, 'gem',     'variants', 50,    'Mata Jeli',           'Sharp Eye'),

    A('fish10k',   2, 'fish',    'fish',     1e4,   'Legenda Dermaga',     'Pier Legend'),
    A('cast2500',  2, 'hook',    'casts',    2500,  'Tak Kenal Lelah',     'Tireless'),
    A('trench',    2, 'target',  'depth',    480,   'Ke Dalam Palung',     'Into the Trench'),
    A('sp40',      2, 'book',    'species',  40,    'Ahli Biologi Laut',   'Marine Biologist'),
    A('coin1b',    2, 'coin',    'coins',    1e9,   'Miliarder Bahari',    'Sea Billionaire'),
    A('prism1',    2, 'sparkle', 'prism',    1,     'Pelangi di Air',      'Rainbow in the Water'),
    A('season1',   2, 'pearl',   'seasons',  1,     'Musim Kedua',         'Second Season'),
    A('haul40',    2, 'net',     'haulFish', 40,    'Pukat Penuh',         'Bursting Trawl'),
    A('master1',   2, 'star',    'master',   1,     'Sang Ahli',           'The Expert'),
    A('time10h',   2, 'timer',   'time',     36000, 'Pelaut Sejati',       'True Sailor'),
    A('days7',     2, 'sparkle', 'days',     7,     'Seminggu Memancing',  'A Week of Fishing'),
    A('gear5',     2, 'shop',    'gear',     5,     'Lemari Gnome',        'Gnome Wardrobe'),
    A('full250',   2, 'crate',   'full',     250,   'Juragan Peti',        'Crate Boss'),
    A('var150',    2, 'gem',     'variants', 150,   'Pemburu Varian',      'Variant Hunter'),

    A('fish100k',  3, 'fish',    'fish',     1e5,   'Raja Nelayan',        'Fisher King'),
    A('weird',     3, 'eye',     'depth',    1050,  'Yang Aneh-Aneh',      'Something Weird'),
    A('boss5',     3, 'crown',   'boss',     5,     'Penakluk Laut',       'Sea Conqueror'),
    A('sp60',      3, 'book',    'species',  60,    'Ensiklopedia Hidup',  'Living Encyclopedia'),
    A('coin1t',    3, 'coin',    'coins',    1e12,  'Triliuner Samudra',   'Ocean Trillionaire'),
    A('titan1',    3, 'crown',   'titan',    1,     'Ikan Raksasa',        'Titan Catch'),
    A('season5',   3, 'pearl',   'seasons',  5,     'Lima Musim',          'Five Seasons'),
    A('pearl40',   3, 'pearl',   'pearls',   40,    'Kalung Mutiara',      'Pearl Necklace'),
    A('master5',   3, 'star',    'master',   5,     'Guru Besar',          'Grandmaster'),
    A('d2000',     3, 'target',  'depth',    2000,  'Dua Kilometer',       'Two Kilometres'),
    A('spAll',     3, 'book',    'species',  0,     'Semua Tertangkap',    'Caught Them All'),
    A('days30',    3, 'sparkle', 'days',     30,    'Sebulan Setia',       'A Loyal Month'),

    A('fish1m',    4, 'fish',    'fish',     1e6,   'Sejuta Ikan',         'A Million Fish'),
    A('d5000',     4, 'target',  'depth',    5000,  'Dasar Dunia',         'Bottom of the World'),
    A('varAll',    4, 'gem',     'variants', 0,     'Tak Ada yang Terlewat', 'Nothing Missed'),
    A('coin1qa',   4, 'coin',    'coins',    1e15,  'Harta Karun',         'Sunken Treasure'),
    A('titan25',   4, 'crown',   'titan',    25,    'Pawang Raksasa',      'Titan Tamer'),
    A('season25',  4, 'pearl',   'seasons',  25,    'Penjaga Musim',       'Keeper of Seasons'),
    A('master25',  4, 'star',    'master',   25,    'Mahaguru Laut',       'Sea Sage'),
    A('time100h',  4, 'timer',   'time',     360000, 'Gnome Laut Abadi',   'Eternal Sea Gnome'),
    A('gearAll',   4, 'crown',   'gear',     0,     'Armada Lengkap',      'Full Fleet'),
  ];
  const SHELL_PAY = [3, 6, 12, 25, 50];

  // Gnome outfits and boats, bought with shells. Equip one of each; the perk works while it is
  // equipped. fx keys are the skill tree effect keys (added on top of the tree), plus
  // gvalue (all fish value x(1+v)), deep (fish from the Trench down x(1+v)) and moon
  // (a full moon every few casts). zone: deepest zone needed to buy; ach: achievement needed.
  // pal: gnome recolour [hat light, hat dark, beard, shirt]. See docs/DESIGN.md section 10.
  const G = (id, kind, cost, zone, nameId, nameEn, descId, descEn, fx, extra) =>
    Object.assign({ id, kind, cost, zone, name: { id: nameId, en: nameEn }, desc: { id: descId, en: descEn }, fx }, extra || {});
  const GEAR = [
    G('classic', 'skin', 0,   0, 'Gnome Klasik', 'Classic Gnome', 'Topi merah kesayangan. Tanpa bonus, penuh gaya.', 'The trusty red hat. No perk, all style.', {}, { pal: ['#ff6a4d', '#d8452f', '#f4efe6', '#3f6fb5'] }),
    G('straw',   'skin', 10,  0, 'Pemulung Pantai', 'Beachcomber', 'Sampah x2 nilainya, jangkauan kail +10%.', 'Junk worth x2, hook reach +10%.', { junk: 1, reach: 0.1 }, { pal: ['#f2cf6b', '#c99a3b', '#f4efe6', '#3f9f58'] }),
    G('diver',   'skin', 30,  1, 'Penyelam', 'Diver', 'Kail turun 15% lebih cepat, kemudi +10%.', 'Hook sinks 15% faster, steering +10%.', { sink: 0.15, steer: 0.1 }, { pal: ['#ffd23f', '#e0a91a', '#f4efe6', '#1f6f8b'], acc: 'mask' }),
    G('chef',    'skin', 40,  2, 'Koki Kapal', 'Ship Cook', 'Semua ikan +10% nilai.', 'All fish +10% value.', { gvalue: 0.1 }, { pal: ['#fbf7ef', '#d9d2c4', '#f4efe6', '#e0473a'] }),
    G('keeper',  'skin', 55,  2, 'Penjaga Mercusuar', 'Lighthouse Keeper', 'Keramba +30%, batas offline +3 jam.', 'Fish pen +30%, offline limit +3 h.', { pondmul: 0.3, offline: 3 }, { pal: ['#2f4d8a', '#1f335f', '#d9e2f2', '#f5b82e'] }),
    G('lucky',   'skin', 70,  3, 'Gnome Hoki', 'Lucky Gnome', 'Peluang mutasi +30%, ikan langka +15%.', 'Mutation chance +30%, rare fish +15%.', { mut: 0.3, rare: 0.15 }, { pal: ['#3f9f58', '#2b7a40', '#f4efe6', '#f5b82e'] }),
    G('captain', 'skin', 110, 4, 'Kapten Tua', 'Old Captain', 'Tarik 20% lebih cepat, pelindung kail +1.', 'Reel 20% faster, hook guard +1.', { reel: 0.2, guard: 1 }, { pal: ['#26304a', '#151b2c', '#f4efe6', '#26304a'], acc: 'badge' }),
    G('abyss',   'skin', 170, 5, 'Gnome Jurang', 'Abyss Gnome', 'Ikan dari Palung ke bawah +35% nilai.', 'Fish from the Trench down +35% value.', { deep: 0.35 }, { pal: ['#7a4fd1', '#4e2f94', '#7af0ff', '#1a1030'] }),
    G('golden',  'skin', 260, 0, 'Gnome Emas', 'Golden Gnome', 'Semua ikan +15% nilai, ikan bermutasi +30% lagi.', 'All fish +15% value, mutated fish another +30%.', { gvalue: 0.15, mutval: 0.3 }, { pal: ['#f5b82e', '#c98a12', '#ffe08a', '#c98a12'], ach: 'sp60' }),

    G('sampan',   'boat', 0,   0, 'Sampan', 'Rowboat', 'Perahu kayu pertama. Tanpa bonus.', 'Your first wooden boat. No perk.', {}),
    G('jukung',   'boat', 20,  0, 'Jukung', 'Outrigger', '+1 ikan per lemparan, tarik +10%.', '+1 fish per cast, reel +10%.', { cap: 1, reel: 0.1 }),
    G('ketek',    'boat', 40,  2, 'Perahu Ketek', 'Longtail', 'Tarik 25% lebih cepat, kemudi +15%.', 'Reel 25% faster, steering +15%.', { reel: 0.25, steer: 0.15 }),
    G('pinisi',   'boat', 70,  3, 'Pinisi', 'Pinisi', '+2 ikan per lemparan, peti penuh +15%.', '+2 fish per cast, full crate +15%.', { cap: 2, full: 0.15 }),
    G('riset',    'boat', 120, 4, 'Kapal Riset', 'Research Vessel', 'Sonar gratis, ikan langka +25%, pelindung +1.', 'Free sonar, rare fish +25%, guard +1.', { sonar: 1, rare: 0.25, guard: 1 }),
    G('pukat',    'boat', 130, 4, 'Kapal Pukat', 'Trawler', '+4 ikan per lemparan, borongan +0.5% per ikan.', '+4 fish per cast, bulk +0.5% per fish.', { cap: 4, bulk: 0.005 }),
    G('selam',    'boat', 190, 5, 'Kapal Selam Mini', 'Mini Sub', 'Jatuh bebas +10% tali, turun +20%.', 'Free fall +10% of the line, sink +20%.', { fall: 0.1, sink: 0.2 }),
    G('hantu',    'boat', 300, 0, 'Kapal Hantu', 'Ghost Ship', 'Malam purnama lebih sering, mutasi x1.3.', 'Full moons come sooner, mutations x1.3.', { moon: 1, mutx: 0.3 }, { ach: 'd2000' }),
  ];

  const MASTERY = [10, 50, 250, 1000]; // catches per species; each step: +25% for that species

  const D = { ZONES, SPECIES, MUTATIONS, NODES, MASTERY, TIER, applyTier, ACH, SHELL_PAY, GEAR, BOSSES, TIMES, WEATHERS, BAITS };
  if (typeof module !== 'undefined') module.exports = D; else (root.KL = root.KL || {}).DATA = D;
})(this);
