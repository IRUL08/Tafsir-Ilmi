"""
Script untuk memproses ulang (re-process) data tafsir lama di Supabase
agar mengikuti 3 ATURAN WAJIB SISTEM yang baru:
1. 1 Kategori Sains Utama
2. Node label ringkas (1-3 kata) + penjelasan di 'deskripsi'
3. HANYA 4 Relasi: :MEMBAHAS_TOPIK, :MENYEBUTKAN, :BERLANJUT_KE, :MENYEBABKAN
"""

import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from config import supabase
from groq_service import extract_knowledge_graph
from models import ALLOWED_RELATIONS

def reprocess_single_tafsir(tafsir_id: str):
    # 1. Ambil data tafsir dari Supabase
    res = supabase.table('tafsir').select('id, source, content').eq('id', tafsir_id).single().execute()
    if not res.data:
        print(f"[!] Tafsir ID {tafsir_id} tidak ditemukan.")
        return False
        
    tafsir = res.data
    source = tafsir.get('source') or 'Tidak diketahui'
    content = tafsir.get('content', '')
    
    print(f"\n[*] Memproses ulang: {source} (ID: {tafsir_id})")
    
    # 2. Ekstrak Knowledge Graph baru via AI Groq dengan 3 aturan wajib
    extracted = extract_knowledge_graph(content)
    print(f"    -> Topik Baru : {extracted.topic}")
    print(f"    -> Total Node : {len(extracted.nodes)}")
    print(f"    -> Total Edge : {len(extracted.edges)}")
    
    # 3. Update atau simpan topik di tabel topics
    topic_res = supabase.table('topics').select('id').eq('name', extracted.topic).execute()
    if topic_res.data and len(topic_res.data) > 0:
        topic_id = topic_res.data[0]['id']
    else:
        new_top = supabase.table('topics').insert({
            'name': extracted.topic,
            'description': f"Kategori sains utama: {extracted.topic}"
        }).execute()
        topic_id = new_top.data[0]['id']
        
    supabase.table('tafsir').update({'topic_id': topic_id}).eq('id', tafsir_id).execute()
    
    # 4. Hapus nodes & edges lama yang masih memakai relasi lama
    supabase.table('edges').delete().eq('tafsir_id', tafsir_id).execute()
    supabase.table('nodes').delete().eq('tafsir_id', tafsir_id).execute()
    print("    -> Nodes & Edges lama berhasil dibersihkan.")
    
    # 5. Simpan nodes baru dengan deskripsi
    node_id_map = {}
    for node in extracted.nodes:
        payload = {
            'tafsir_id': tafsir_id,
            'label': node.label,
            'type': node.type
        }
        try:
            insert_res = supabase.table('nodes').insert({
                **payload,
                'deskripsi': node.deskripsi or ""
            }).execute()
        except Exception:
            insert_res = supabase.table('nodes').insert(payload).execute()
            
        node_id_map[node.label] = insert_res.data[0]['id']
        
    # 6. Simpan edges baru (Hanya 4 relasi wajib)
    saved_edges = 0
    for edge in extracted.edges:
        s_id = node_id_map.get(edge.source_node)
        t_id = node_id_map.get(edge.target_node)
        if s_id and t_id:
            supabase.table('edges').insert({
                'tafsir_id': tafsir_id,
                'source_node_id': s_id,
                'target_node_id': t_id,
                'relation': edge.relation
            }).execute()
            saved_edges += 1
            
    print(f"    [OK] Berhasil diperbarui! {len(extracted.nodes)} nodes, {saved_edges} edges.")
    return True

def cleanup_duplicates():
    print("[*] Memeriksa duplikasi data tafsir...")
    res = supabase.table('tafsir').select('id, source, created_at').order('created_at').execute().data
    from collections import defaultdict
    by_source = defaultdict(list)
    for r in res:
        by_source[r['source']].append(r['id'])
        
    deleted_count = 0
    for src, ids in by_source.items():
        if len(ids) > 1:
            # Pertahankan ID terakhir (paling baru), hapus yang lebih lama
            to_delete = ids[:-1]
            for d_id in to_delete:
                try:
                    supabase.table('edges').delete().eq('tafsir_id', d_id).execute()
                    supabase.table('nodes').delete().eq('tafsir_id', d_id).execute()
                    supabase.table('tafsir').delete().eq('id', d_id).execute()
                    deleted_count += 1
                except Exception as err:
                    print(f"    Gagal hapus duplikat {d_id}: {err}")
                    
    if deleted_count > 0:
        print(f"[✓] Berhasil membersihkan {deleted_count} data duplikat berulang.")
    else:
        print("[✓] Tidak ditemukan duplikat.")

def reprocess_all_old_data():
    print("=" * 60)
    print("  MIGRASI DATA LAMA: Reproses Tafsir ke 4 Relasi Wajib")
    print("=" * 60)
    
    # 1. Bersihkan duplikat dulu agar rapi
    cleanup_duplicates()
    
    # 2. Cari semua tafsir yang memiliki edge di luar 4 relasi wajib
    all_edges_res = supabase.table('edges').select('tafsir_id, relation').execute()
    tafsir_with_old_edges = set()
    for e in all_edges_res.data:
        if e['relation'] not in ALLOWED_RELATIONS:
            tafsir_with_old_edges.add(e['tafsir_id'])
            
    total = len(tafsir_with_old_edges)
    print(f"\nDitemukan {total} data tafsir unik yang masih menggunakan relasi lama.")
    
    success = 0
    failed = 0
    for i, t_id in enumerate(list(tafsir_with_old_edges), 1):
        print(f"\n[{i}/{total}]")
        try:
            ok = reprocess_single_tafsir(t_id)
            if ok:
                success += 1
            else:
                failed += 1
        except Exception as err:
            print(f"    [FAIL] Error memproses {t_id}: {err}")
            failed += 1
        time.sleep(1.8)  # Jeda rate limit API
        
    print("\n" + "=" * 60)
    print(f"  SELESAI! Berhasil: {success} | Gagal: {failed} | Total: {total}")
    
    # Verifikasi akhir
    verify_res = supabase.table('edges').select('relation').execute()
    old_remaining = [e['relation'] for e in verify_res.data if e['relation'] not in ALLOWED_RELATIONS]
    print(f"  Sisa relasi versi lama di seluruh database: {len(old_remaining)}")
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "--all":
            reprocess_all_old_data()
        elif arg == "--clean":
            cleanup_duplicates()
        else:
            reprocess_single_tafsir(arg)
    else:
        reprocess_all_old_data()

