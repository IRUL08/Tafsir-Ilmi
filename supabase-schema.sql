-- Hapus tabel jika sudah ada (Opsional untuk reset)
-- DROP TABLE IF EXISTS edges, nodes, tafsir, topics;

-- 1. Tabel Kategori Sains (Topics)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Teks Tafsir (Tafsir)
CREATE TABLE tafsir (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Entitas Knowledge Graph (Nodes)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tafsir_id UUID REFERENCES tafsir(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL, -- Ringkas (Maksimal 1 - 3 kata)
    type VARCHAR(100),           -- Ayat, Topik Sains, atau Konsep
    deskripsi TEXT,              -- Penjelasan panjang detail konsep/ayat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Perintah migrasi untuk database yang sudah berjalan sebelumnya:
-- ALTER TABLE nodes ADD COLUMN IF NOT EXISTS deskripsi TEXT;

-- 4. Tabel Relasi Knowledge Graph (Edges)
CREATE TABLE edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tafsir_id UUID REFERENCES tafsir(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    relation VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan RLS (Row Level Security) agar aman (Opsional namun disarankan)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tafsir ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Membuat kebijakan anonim untuk mengizinkan insert/select (untuk pengembangan awal)
CREATE POLICY "Allow public read access" ON topics FOR SELECT USING (true);
CREATE POLICY "Allow public all access on tafsir" ON tafsir FOR ALL USING (true);
CREATE POLICY "Allow public all access on nodes" ON nodes FOR ALL USING (true);
CREATE POLICY "Allow public all access on edges" ON edges FOR ALL USING (true);
CREATE POLICY "Allow public all access on topics" ON topics FOR ALL USING (true);
