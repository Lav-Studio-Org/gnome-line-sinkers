// Help pages: how the game works, in plain words. Opened from the "?" button and the menu.
// Numbers here must follow the rules in engine.js and data.js; docs/DESIGN.md has the why.
(function (root) {
  'use strict';
  const KL = (root.KL = root.KL || {});
  KL.HELP = {
    id: [
      { icon: 'hook', title: 'Cara memancing', body: `
        <p>Ketuk laut untuk melempar kail. Saat turun, arahkan kail dengan jari, joystick, atau tombol panah.</p>
        <ul><li><b>Turun:</b> hindari ikan. Ikan pertama yang tersenggol langsung menggigit dan kail berbalik naik.</li>
        <li><b>Naik:</b> sentuh ikan sebanyak mungkin sampai peti penuh (lihat angka ikan di kanan atas).</li>
        <li>Makin dalam, ikannya makin mahal. Setelah sampai di permukaan, ketuk Ambil untuk menyimpan koin.</li></ul>` },
      { icon: 'rope', title: 'Tali', body: `
        <p>Tali adalah panjang yang sudah terulur, bukan batas kedalaman. Setiap meter turun memakai 1 m tali, dan setiap meter ke samping memakai 1,8 m.</p>
        <ul><li>Sisa tali tampil di kanan atas dan berubah merah saat tinggal 20%.</li>
        <li>Garis oranye di penggaris kiri adalah titik terdalam yang masih bisa dicapai kalau turun lurus.</li>
        <li>Arus juga menyeret tali. Skill Kemudi Halus membuat gerakan ke samping lebih hemat.</li></ul>` },
      { icon: 'weight', title: 'Rintangan', body: `
        <ul><li><b>Batu:</b> kail meluncur memutarinya, hanya memutar jalan.</li>
        <li><b>Bulu babi:</b> tersenggol saat turun membuat kail berbalik naik.</li>
        <li><b>Ranjau:</b> saat turun membuat kail berbalik dan ikan kabur. Saat naik, satu ikan lepas.</li>
        <li><b>Jaring hantu:</b> semua jadi lambat di dalamnya.</li>
        <li><b>Arus:</b> mendorong kail ke samping. <b>Gelembung:</b> mendorong kail ke atas.</li></ul>` },
      { icon: 'crown', title: 'Penjaga zona', body: `
        <p>Setiap zona dijaga satu ikan besar. Talimu tidak bisa lewat sebelum penjaganya tertangkap. Sampai di arenanya, pertarungan langsung mulai.</p>
        <ul><li><b>Cara menang:</b> arahkan kail ke sisi yang berlawanan dari arah larinya. Tanda panah hijau berarti tarikanmu menahan dia.</li>
        <li>Saat lari bebas, ia menarik talimu keluar. Kalau tali habis, ia lolos.</li>
        <li>Sebelum bergerak ia berkedip putih: berbalik, menyentak, menyelam, atau cuma menipu.</li>
        <li>Kalau lolos, separuh tenaga yang sudah kamu kuras tetap hilang. Coba lagi, ia makin lemah.</li>
        <li>Tali yang lebih panjang memberi ruang bertarung lebih longgar. Skill Gulungan Cepat menguras tenaganya lebih cepat.</li>
        <li>Tangkapan pertama memberi kerang dan membuka zona berikutnya untuk selamanya.</li></ul>` },
      { icon: 'timer', title: 'Istirahat penjaga', body: `
        <p>Penjaga yang sudah kalah tetap berenang di arenanya untuk tantangan ulang (mahkota ungu). Ia hanya bertarung kalau kail menyentuhnya.</p>
        <ul><li>Setelah tertangkap lagi, ia istirahat <b>12 lemparan</b> (1 hari di laut).</li>
        <li>Kalau ia lolos dalam tantangan ulang, ia istirahat <b>4 lemparan</b>.</li>
        <li>Tangkapan ulang dibayar setengah harga. Tangkapan pertama dibayar penuh.</li>
        <li>Penjaga gerbang yang belum kalah tidak pernah istirahat: ia selalu menunggumu.</li></ul>` },
      { icon: 'sun', title: 'Waktu, cuaca, umpan', body: `
        <p>Prakiraan di dermaga menunjukkan kondisi lemparan berikutnya, dan selalu tepat. Ketuk chipnya untuk detail.</p>
        <ul><li><b>Waktu</b> berganti tiap 3 lemparan. Pagi: ikan ramai di dekat permukaan. Siang: tarik 10% lebih cepat. Senja: ikan langka 60% lebih sering. Malam: ikan bercahaya 2x, mutasi +40%.</li>
        <li><b>Cuaca</b> bertahan 4 lemparan. Hujan: ikan +20% tapi lebih gesit. Badai: koin +50%, tapi arus kuat menghabiskan tali.</li>
        <li><b>Umpan</b> gratis dan terbuka seiring zona. Pelet: ikan lebih banyak. Udang: ikan langka lebih sering. Umpan Lampu: ikan bercahaya dan mutasi. Tiap umpan ada ruginya juga.</li></ul>` },
      { icon: 'sparkle', title: 'Mutasi dan bulan purnama', body: `
        <ul><li><b>Besar</b> x2, <b>Emas</b> x5, <b>Pelangi</b> x15, <b>Raksasa</b> x40 nilai koin.</li>
        <li>Malam purnama (dari skill atau kapal hantu) membuat mutasi 3x lebih sering.</li>
        <li>Setiap varian baru di Buku Ikan menambah 1% nilai semua ikan.</li>
        <li>Menangkap satu jenis ikan 10, 50, 250, dan 1000 kali menambah nilainya 25% tiap tingkat.</li></ul>` },
      { icon: 'tree', title: 'Skill', body: `
        <p>Koin dipakai membeli skill. Cabangnya: tali, peti, nilai, keberuntungan, keramba, dan kendali.</p>
        <ul><li>Simpul "?" adalah skill rahasia. Beli tetangganya untuk melihat isinya.</li>
        <li>Angka di tombol Skill menunjukkan berapa skill yang bisa dibeli sekarang.</li></ul>` },
      { icon: 'pearl', title: 'Musim baru', body: `
        <p>Setelah mencapai 480 m, kamu bisa memulai musim baru.</p>
        <ul><li><b>Direset:</b> koin, skill koin, dan rekor kedalaman musim ini.</li>
        <li><b>Tetap:</b> Buku Ikan, mutiara, skill mutiara, kerang, pakaian, kapal, dan gerbang penjaga yang sudah terbuka.</li>
        <li>Mutiara dibayar untuk rekor kedalaman baru: 480 m = 5, 1000 m = 12, 2000 m = 20 total. Setiap mutiara yang pernah didapat menambah 10% nilai ikan.</li></ul>` },
      { icon: 'shell', title: 'Kerang, pencapaian, toko', body: `
        <ul><li>Kerang didapat dari pencapaian, jenis ikan baru, penguasaan ikan, penjaga, dan musim baru.</li>
        <li>Kerang membeli pakaian gnome dan kapal di Toko. Masing-masing punya bonus selama dipakai.</li></ul>` },
      { icon: 'pond', title: 'Keramba dan offline', body: `
        <p>Skill Keramba membuat koleksi ikanmu menghasilkan koin terus, juga saat game ditutup (awalnya sampai 3 jam).</p>` },
      { icon: 'download', title: 'Simpanan dan update', body: `
        <ul><li>Game tersimpan otomatis di perangkat ini.</li>
        <li>Menu > Simpan file membuat file .sav untuk dipindah ke perangkat lain (Menu > Muat file).</li>
        <li>Kalau ada versi baru, Menu > Perbarui game mengunduh ulang game tanpa menghapus progres.</li></ul>` },
    ],
    en: [
      { icon: 'hook', title: 'How to fish', body: `
        <p>Tap the sea to cast. On the way down, steer the hook with your finger, the joystick or the arrow keys.</p>
        <ul><li><b>Down:</b> dodge fish. The first fish you bump bites and the hook turns back up.</li>
        <li><b>Up:</b> touch as many fish as you can until the crate is full (the fish count, top right).</li>
        <li>Deeper fish are worth more. At the surface, tap Take to bank the coins.</li></ul>` },
      { icon: 'rope', title: 'Line', body: `
        <p>Line is the length paid out, not a depth limit. Every metre down uses 1 m of line, and every metre sideways uses 1.8 m.</p>
        <ul><li>Line left shows top right and turns red at 20%.</li>
        <li>The orange mark on the left ruler is the deepest point still in reach going straight down.</li>
        <li>Currents drag the line too. The Smooth Steering skill makes side moves cheaper.</li></ul>` },
      { icon: 'weight', title: 'Obstacles', body: `
        <ul><li><b>Rocks:</b> the hook slides around them, just a detour.</li>
        <li><b>Urchins:</b> brushing one on the way down turns the hook back up.</li>
        <li><b>Mines:</b> on the way down they turn the hook and scare fish. On the way up, a fish falls off.</li>
        <li><b>Ghost nets:</b> everything is slow inside.</li>
        <li><b>Currents:</b> push the hook sideways. <b>Bubble vents:</b> push it up.</li></ul>` },
      { icon: 'crown', title: 'Zone guardians', body: `
        <p>Every zone is guarded by one big fish. Your line cannot pass until it is caught. Reaching its arena starts the fight.</p>
        <ul><li><b>To win:</b> aim the hook on the far side of where it is swimming. A green arrow means your pull is holding it.</li>
        <li>While it runs free it takes line. If the line runs out, it gets away.</li>
        <li>It flashes white before a move: a turn, a burst, a dive, or just a feint.</li>
        <li>If it gets away, half the stamina you took stays gone. Try again, it gets weaker.</li>
        <li>More line gives you more room to fight. Reel speed tires it faster.</li>
        <li>The first catch pays shells and opens the next zone for good.</li></ul>` },
      { icon: 'timer', title: 'Guardian rest', body: `
        <p>A beaten guardian stays in its arena for rematches (lilac crown). It only fights if the hook touches it.</p>
        <ul><li>Caught again, it rests for <b>12 casts</b> (1 day at sea).</li>
        <li>If it gets away in a rematch, it rests for <b>4 casts</b>.</li>
        <li>A rematch catch pays half. The first catch pays in full.</li>
        <li>A gate guardian you have not beaten never rests: it is always waiting.</li></ul>` },
      { icon: 'sun', title: 'Time, weather, bait', body: `
        <p>The forecast on the dock shows the next cast's conditions, and it is always right. Tap a chip for details.</p>
        <ul><li><b>Time</b> turns every 3 casts. Morning: fish crowd near the surface. Midday: reel 10% faster. Dusk: rare fish 60% more often. Night: glowing fish 2x, mutations +40%.</li>
        <li><b>Weather</b> holds for 4 casts. Rain: +20% fish, but faster. Storm: +50% coins, but strong currents eat line.</li>
        <li><b>Bait</b> is free and unlocks with zones. Pellets: more fish. Shrimp: more rare fish. Glow Lure: glowing fish and mutations. Each one has a downside too.</li></ul>` },
      { icon: 'sparkle', title: 'Mutations and full moons', body: `
        <ul><li><b>Big</b> x2, <b>Golden</b> x5, <b>Prismatic</b> x15, <b>Titan</b> x40 coin value.</li>
        <li>A full-moon night (from a skill or the ghost ship) makes mutations 3x as common.</li>
        <li>Every new variant in the Fishdex adds 1% to the value of all fish.</li>
        <li>Catching a species 10, 50, 250 and 1000 times adds 25% to its value at each step.</li></ul>` },
      { icon: 'tree', title: 'Skills', body: `
        <p>Coins buy skills. The branches: line, crate, value, luck, fish pen and control.</p>
        <ul><li>"?" nodes are secret skills. Buy a neighbour to see what they are.</li>
        <li>The number on the Skills button is how many you can buy right now.</li></ul>` },
      { icon: 'pearl', title: 'New season', body: `
        <p>Once you reach 480 m you can start a new season.</p>
        <ul><li><b>Reset:</b> coins, coin skills and this season's depth record.</li>
        <li><b>Kept:</b> the Fishdex, pearls, pearl skills, shells, outfits, boats and every guardian gate you opened.</li>
        <li>Pearls pay for new depth records: 480 m = 5, 1000 m = 12, 2000 m = 20 in total. Every pearl ever earned adds 10% to fish value.</li></ul>` },
      { icon: 'shell', title: 'Shells, achievements, shop', body: `
        <ul><li>Shells come from achievements, new species, species mastery, guardians and new seasons.</li>
        <li>Shells buy gnome outfits and boats in the Shop. Each one has a perk while you use it.</li></ul>` },
      { icon: 'pond', title: 'Fish pen and offline', body: `
        <p>The Fish Pen skill makes your collection earn coins all the time, even while the game is closed (up to 3 hours at first).</p>` },
      { icon: 'download', title: 'Saves and updates', body: `
        <ul><li>The game saves itself on this device.</li>
        <li>Menu > Save file makes a .sav file to move to another device (Menu > Load file).</li>
        <li>When a new version is out, Menu > Update game downloads it again without touching your progress.</li></ul>` },
    ],
  };
})(this);
