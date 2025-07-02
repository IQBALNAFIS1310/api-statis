const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

const filePath = './data.json';

// Fungsi bantu: baca data dari file
function readUsers() {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
}

// Fungsi bantu: tulis data ke file
function saveUsers(users) {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

// GET semua user
app.get('/users', (req, res) => {
    const users = readUsers();
    res.json(users);
});

// POST user baru
app.post('/users', (req, res) => {
    const users = readUsers();
    const { nama } = req.body;
    const id = users.length > 0 ? users[users.length - 1].id + 1 : 1;
    const newUser = { id, nama };
    users.push(newUser);
    saveUsers(users);
    res.status(201).json(newUser);
});

//UPDATE data
app.put('/users/:id', (req, res) => {
    let users = readUsers();
    const id = parseInt(req.params.id);
    const { nama } = req.body;

    const index = users.findIndex(user => user.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    users[index].nama = nama;
    saveUsers(users);
    res.json({ message: `User dengan ID ${id} diupdate`, user: users[index] });
});

// DELETE user
app.delete('/users/:id', (req, res) => {
    let users = readUsers();
    const id = parseInt(req.params.id);
    users = users.filter(user => user.id !== id);
    saveUsers(users);
    res.json({ message: `User dengan ID ${id} dihapus` });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`API berjalan di http://0.0.0.0:${PORT}`);
});