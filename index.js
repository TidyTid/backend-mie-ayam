require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "Koneksi berhasil", waktu: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- KATEGORI (secukupnya, supaya menu bisa punya kategori) ----------
app.get("/kategori", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM kategori ORDER BY id");
    res.status(200).json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/kategori", async (req, res) => {
  const { nama_kategori } = req.body;
  if (!nama_kategori) {
    return res.status(400).json({ error: "Field nama_kategori wajib diisi" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO kategori (nama_kategori) VALUES ($1) RETURNING *",
      [nama_kategori],
    );
    res
      .status(201)
      .json({ message: "Kategori berhasil ditambahkan", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- MENU (CRUD lengkap) ----------

// GET semua menu
app.get("/menu", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, k.nama_kategori
       FROM menu m
       LEFT JOIN kategori k ON m.id_kategori = k.id
       ORDER BY m.id`,
    );
    res.status(200).json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET satu menu
app.get("/menu/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, k.nama_kategori
       FROM menu m
       LEFT JOIN kategori k ON m.id_kategori = k.id
       WHERE m.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Menu tidak ditemukan" });
    }
    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST tambah menu
app.post("/menu", async (req, res) => {
  const { nama_menu, harga, stok, id_kategori } = req.body;
  if (!nama_menu) {
    return res.status(400).json({ error: "Field nama_menu wajib diisi" });
  }
  if (harga === undefined || isNaN(Number(harga))) {
    return res
      .status(400)
      .json({ error: "Field harga wajib diisi dan harus berupa angka" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO menu (nama_menu, harga, stok, id_kategori)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nama_menu, harga, stok ?? 0, id_kategori ?? null],
    );
    res
      .status(201)
      .json({ message: "Menu berhasil ditambahkan", data: result.rows[0] });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ error: "id_kategori tidak ditemukan" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT ubah menu
app.put("/menu/:id", async (req, res) => {
  const { nama_menu, harga, stok, id_kategori } = req.body;
  if (!nama_menu || harga === undefined || stok === undefined) {
    return res
      .status(400)
      .json({ error: "Field nama_menu, harga, dan stok wajib diisi" });
  }
  try {
    const result = await pool.query(
      `UPDATE menu
       SET nama_menu = $1, harga = $2, stok = $3, id_kategori = $4
       WHERE id = $5 RETURNING *`,
      [nama_menu, harga, stok, id_kategori ?? null, req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Menu tidak ditemukan" });
    }
    res
      .status(200)
      .json({ message: "Menu berhasil diubah", data: result.rows[0] });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ error: "id_kategori tidak ditemukan" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE hapus menu
app.delete("/menu/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM menu WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Menu tidak ditemukan" });
    }
    res
      .status(200)
      .json({ message: "Menu berhasil dihapus", data: result.rows[0] });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({
        error: "Menu tidak bisa dihapus karena sudah dipakai di pesanan",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Jalan di http://localhost:3000"));
