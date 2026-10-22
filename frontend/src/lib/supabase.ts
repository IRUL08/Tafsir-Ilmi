import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type Topic = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Tafsir = {
  id: string
  content: string
  source: string | null
  topic_id: string | null
  created_at: string
  topics?: Topic
}

export type Node = {
  id: string
  tafsir_id: string
  label: string
  type: string | null
  created_at: string
}

export type Edge = {
  id: string
  tafsir_id: string
  source_node_id: string
  target_node_id: string
  relation: string
  created_at: string
}
