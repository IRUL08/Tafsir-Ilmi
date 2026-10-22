from config import supabase
from models import ExtractedKnowledge

def save_to_supabase(text: str, source: str, data: ExtractedKnowledge):
    if not supabase:
        raise Exception("Koneksi Supabase belum dikonfigurasi.")
        
    try:
        # 1. Simpan atau ambil Topic
        topic_response = supabase.table('topics').select('id').eq('name', data.topic).execute()
        
        if len(topic_response.data) > 0:
            topic_id = topic_response.data[0]['id']
        else:
            new_topic = supabase.table('topics').insert({
                'name': data.topic,
                'description': f"Kategori sains utama: {data.topic}"
            }).execute()
            topic_id = new_topic.data[0]['id']
            
        # 2. Simpan teks Tafsir
        tafsir_insert = supabase.table('tafsir').insert({
            'content': text,
            'source': source,
            'topic_id': topic_id
        }).execute()
        tafsir_id = tafsir_insert.data[0]['id']
        
        # 3. Simpan Nodes
        # Simpan pemetaan nama node ke UUID
        node_id_map = {}
        for node in data.nodes:
            node_payload = {
                'tafsir_id': tafsir_id,
                'label': node.label,
                'type': node.type
            }
            # Coba simpan dengan deskripsi jika kolom sudah ada di Supabase
            try:
                node_insert = supabase.table('nodes').insert({
                    **node_payload,
                    'deskripsi': node.deskripsi or ""
                }).execute()
            except Exception:
                # Fallback ke skema tanpa deskripsi jika kolom deskripsi belum dibuat di Supabase
                node_insert = supabase.table('nodes').insert(node_payload).execute()
                
            node_id_map[node.label] = node_insert.data[0]['id']
            
        # 4. Simpan Edges
        for edge in data.edges:
            # Pastikan node sumber dan target ada di map
            source_id = node_id_map.get(edge.source_node)
            target_id = node_id_map.get(edge.target_node)
            
            if source_id and target_id:
                supabase.table('edges').insert({
                    'tafsir_id': tafsir_id,
                    'source_node_id': source_id,
                    'target_node_id': target_id,
                    'relation': edge.relation
                }).execute()
                
        return {"status": "success", "tafsir_id": tafsir_id, "topic": data.topic, "nodes_saved": len(data.nodes), "edges_saved": len(data.edges)}

    except Exception as e:
        raise Exception(f"Gagal menyimpan ke Supabase: {str(e)}")
