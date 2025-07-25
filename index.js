const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Konfigurasi
// const PORT = 25965;
const PORT = 3000;
const VALID_JENJANG = ['sd', 'smp', 'sma', 'logika'];

// Middleware
app.use(cors());
app.use(express.json());

// Helper: ambil path file JSON
function getFilePath(tingkat) {
    return path.join(__dirname, 'data', `${tingkat}.json`);
}

// Helper: baca soal
function bacaSoal(tingkat) {
    const filePath = getFilePath(tingkat);
    if (!fs.existsSync(filePath)) return [];

    const data = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(data);
    } catch (err) {
        console.error(`Gagal parsing ${tingkat}.json`, err);
        return [];
    }
}

// Helper: simpan soal
function simpanSoal(tingkat, data) {
    const filePath = getFilePath(tingkat);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ====================
// Endpoint dokumentasi
// ====================
app.get('/', (req, res) => {
    res.json({
        endpoints: {
            "GET /jenjang/soal": "Ambil semua soal",
            "GET /jenjang/soal/:id": "Ambil soal berdasarkan ID",
            "GET /jenjang/soal/acak": "Ambil soal acak (opsional: ?jumlah=5)",
            "GET /jenjang/soal?difficulty=Easy": "Filter soal berdasarkan difficulty",
            "GET /jenjang/soal?category=Matematika": "Filter soal berdasarkan kategori",
            "GET /jenjang/soal?tag=logika": "Filter soal berdasarkan tag",
            "GET /jenjang/soal/statistik": "Statistik soal per kategori/difficulty",
            "POST /jenjang/soal": "Tambah soal baru",
            "PUT /jenjang/soal/:id": "Update soal berdasarkan ID",
            "DELETE /jenjang/soal/:id": "Hapus soal berdasarkan ID"
        },
        contoh_jenjang: ["sd", "smp", "sma", "logika"]
    });
});

// ===================
// Middleware validasi
// ===================
app.use('/:tingkat/soal', (req, res, next) => {
    const { tingkat } = req.params;
    if (!VALID_JENJANG.includes(tingkat)) {
        return res.status(404).json({ error: 'Tingkat tidak dikenali' });
    }
    next();
});

// ============================
// Ambil semua / filter / query
// ============================
app.get('/:tingkat/soal', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const { difficulty, category, tag } = req.query;

    let hasil = soal;

    if (difficulty) {
        hasil = hasil.filter(s => (s.difficulty || '').toLowerCase() === difficulty.toLowerCase());
    }

    if (category) {
        hasil = hasil.filter(s => (s.category || '').toLowerCase() === category.toLowerCase());
    }

    if (tag) {
        hasil = hasil.filter(s =>
            s.tags && s.tags.some(t => t.name.toLowerCase().includes(tag.toLowerCase()))
        );
    }

    res.json(hasil);
});

// =======================
// Ambil soal acak (acak)
// =======================
app.get('/:tingkat/soal/acak', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const jumlah = parseInt(req.query.jumlah) || 1;

    if (!soal.length) return res.status(404).json({ error: 'Tidak ada soal tersedia' });

    const hasil = [];
    const soalCopy = [...soal];

    while (hasil.length < jumlah && soalCopy.length) {
        const index = Math.floor(Math.random() * soalCopy.length);
        hasil.push(soalCopy.splice(index, 1)[0]);
    }

    res.json(hasil);
});

// =======================
// Ambil soal berdasarkan ID
// =======================
app.get('/:tingkat/soal/:id', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const id = parseInt(req.params.id);
    const item = soal.find(s => s.id === id);
    if (!item) return res.status(404).json({ error: 'Soal tidak ditemukan' });
    res.json(item);
});

// =======================
// Statistik soal
// =======================
app.get('/:tingkat/soal/statistik', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const total = soal.length;
    const byDifficulty = {};
    const byCategory = {};

    soal.forEach(s => {
        const d = s.difficulty || 'Unknown';
        const c = s.category || 'Tidak dikategorikan';

        byDifficulty[d] = (byDifficulty[d] || 0) + 1;
        byCategory[c] = (byCategory[c] || 0) + 1;
    });

    res.json({ total, byDifficulty, byCategory });
});

// =======================
// Tambah soal (POST)
// =======================
app.post('/:tingkat/soal', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const newSoal = req.body;

    newSoal.id = soal.length ? soal[soal.length - 1].id + 1 : 1;
    soal.push(newSoal);
    simpanSoal(req.params.tingkat, soal);

    res.status(201).json({ message: 'Soal berhasil ditambahkan', soal: newSoal });
});

// =======================
// Update soal (PUT)
// =======================
app.put('/:tingkat/soal/:id', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const id = parseInt(req.params.id);
    const index = soal.findIndex(s => s.id === id);

    if (index === -1) return res.status(404).json({ error: 'Soal tidak ditemukan' });

    soal[index] = { ...soal[index], ...req.body, id };
    simpanSoal(req.params.tingkat, soal);

    res.json({ message: 'Soal berhasil diperbarui', soal: soal[index] });
});

// =======================
// Hapus soal (DELETE)
// =======================
app.delete('/:tingkat/soal/:id', (req, res) => {
    const soal = bacaSoal(req.params.tingkat);
    const id = parseInt(req.params.id);
    const newData = soal.filter(s => s.id !== id);

    if (newData.length === soal.length) {
        return res.status(404).json({ error: 'Soal tidak ditemukan' });
    }

    simpanSoal(req.params.tingkat, newData);
    res.json({ message: 'Soal berhasil dihapus' });
});

// =======================
// Jalankan server
// =======================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API berjalan di http://localhost:${PORT}`);
});
