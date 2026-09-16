import json
import os

GRAPH_PATH = "./docs/graphify-out/graph.json"

FILES = {
    "api": "HomePlus — Api + TestCases + Edgecases V1.md",
    "ds": "HomePlus — Desing system v1.md",
    "onboarding": "HomePlus — Diseño de onboarding completo v1.md",
    "home_ui": "HomePlus — Diseño de Pantallas de Home V1.md",
    "auth_ui": "HomePlus — Diseño ed pantallas de Auth v1.md",
    "db": "HomePlus — Esquema de base de datos v1.md",
    "events": "HomePlus — Eventos del sistema v1.md",
    "final_spec": "HomePlus — FinalSpec.md",
    "prod_1": "HomePlus — SECCION 1 PRODUCTO.md",
    "prod_2": "HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md",
    "filosofia_3": "HomePlus — SECCION 3 FILOSOFIA.md",
    "emotional_4": "HomePlus — SECCION 4 EMOTIONAL DESING.md",
    "relations_5": "HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY.md",
    "ux_6": "HomePlus — SECCION 6 UX PHILOSOPHY.md",
    "geni_7": "HomePlus — SECCION 7 AI PHILOSOPHY - GENI.md",
    "data_8": "HomePlus — SECCION 8 DATA PHILOSOPHY.md",
    "ux_writing": "HomePlus — UX writing guide para geni.md"
}

def create_node(node_id, label, file_type, source_file):
    return {
        "id": node_id, "label": label, "norm_label": label.lower(),
        "file_type": file_type, "source_file": source_file, "community": 0
    }

def create_edge(source, target, relation):
    return {
        "source": source, "target": target, "relation": relation,
        "confidence": "CURATED", "confidence_score": 1.0, "weight": 1.0
    }

print("🔨 Construyendo la Topología Definitiva de HomePlus...")
nodes, edges = [], []

# 1. CORE & DOCS
nodes.append(create_node("homeplus", "HomePlus (Sistema Operativo)", "concept", FILES["final_spec"]))
for key, filename in FILES.items():
    doc_id = f"doc_{key}"
    nodes.append(create_node(doc_id, filename.replace('.md', ''), "document", filename))
    edges.append(create_edge(doc_id, "homeplus", "defines_architecture"))

# 2. DOMINIOS
domains = ["People", "Planner", "Finance", "Presence", "Inventory", "Assets", "HomeCloud", "SOS", "Geni", "Automatizaciones", "Feed", "Notificaciones", "System"]
for dom in domains:
    dom_id = f"domain_{dom.lower()}"
    src = FILES["geni_7"] if dom == "Geni" else FILES["final_spec"]
    nodes.append(create_node(dom_id, f"Dominio: {dom}", "concept", src))
    edges.append(create_edge("homeplus", dom_id, "has_domain"))
    if dom != "Geni":
        edges.append(create_edge("domain_geni", dom_id, "operates_across"))

# 3. ROLES
roles = ["Coordinador", "Adulto", "Adolescente", "Niño", "Adulto Mayor", "Invitado", "Empleado Familiar"]
for role in roles:
    r_id = f"role_{role.lower().replace(' ', '_')}"
    nodes.append(create_node(r_id, f"Rol: {role}", "concept", FILES["final_spec"]))
    edges.append(create_edge("homeplus", r_id, "has_role"))
    edges.append(create_edge(r_id, "domain_people", "managed_in"))
edges.append(create_edge("role_coordinador", "homeplus", "administers"))

# 4. ENTIDADES COMPLETAS (Alineado con DB Schema V1)
entities = {
    "domain_planner": ["Tasks", "Task Dependencies", "Task Comments", "Events", "Event Participants", "Goals", "Milestones", "Responsibilities", "Streaks"],
    "domain_finance": ["Accounts", "Expenses", "Expense Splits", "Incomes", "Budgets", "Funds", "Debts"],
    "domain_presence": ["Locations", "Location Settings", "Location History", "Geofences", "Places", "Check-ins"],
    "domain_inventory": ["Inventory Categories", "Inventory Items", "Shopping List", "Expiry Records"],
    "domain_assets": ["Assets", "Asset Documents", "Asset Maintenance", "Pets", "Vehicles", "Properties", "Devices"],
    "domain_homecloud": ["Media Items", "Albums", "Album Items", "Documents", "Document Versions", "Document Access"],
    "domain_people": ["Households", "Household Members", "Invitations"],
    "domain_feed": ["Posts", "Post Reactions", "Post Comments"],
    "domain_sos": ["SOS Alerts", "SOS Recipients"],
    "domain_geni": ["Memory Personal", "Memory Family", "Conversations", "Patterns Log"],
    "domain_automatizaciones": ["Automations", "Automation Logs"],
    "domain_notificaciones": ["Notification Preferences", "Notifications", "Channels"],
    "domain_system": ["Audit Logs", "Load Metrics"]
}

for dom_id, ent_list in entities.items():
    for ent in ent_list:
        ent_id = f"entity_{ent.lower().replace(' ', '_')}"
        nodes.append(create_node(ent_id, f"Entidad: {ent}", "concept", FILES["db"]))
        edges.append(create_edge(dom_id, ent_id, "contains"))

# 5. ECOSISTEMA: RELACIONES CRUZADAS (§05 RELATIONSHIP PHILOSOPHY)
cross_relations = [
    ("entity_tasks", "entity_responsibilities", "belongs_to"),
    ("entity_tasks", "entity_events", "prepares_for"),
    ("entity_tasks", "entity_goals", "advances_progress"),
    ("entity_expenses", "entity_budgets", "consumes"),
    ("entity_expenses", "entity_documents", "has_receipt_in"),
    ("entity_assets", "entity_documents", "documented_by"),
    ("entity_assets", "entity_asset_maintenance", "requires"),
    ("entity_asset_maintenance", "entity_tasks", "generates"),
    ("entity_inventory_items", "entity_shopping_list", "replenished_via"),
    ("entity_inventory_items", "entity_expenses", "purchased_via"),
    ("entity_sos_alerts", "entity_locations", "uses_context_of"),
    ("entity_automations", "entity_notifications", "can_trigger")
]
for src, tgt, rel in cross_relations:
    edges.append(create_edge(src, tgt, rel))

# 6. PRINCIPIOS
principles = [
    ("Asimetría de Coordinación", FILES["prod_1"]),
    ("La verdad primero, el confort después", FILES["prod_2"]),
    ("Privacidad no es opacidad", FILES["prod_2"]),
    ("Seguridad sin pánico (SOS)", FILES["emotional_4"]),
    ("Regla del 1-tap", FILES["ux_6"]),
    ("Los datos son del usuario", FILES["data_8"]),
    ("Auditoría Permanente", FILES["db"])
]
for prin, filename in principles:
    p_id = f"prin_{prin.lower().replace(' ', '_').replace(',', '').replace('(', '').replace(')', '')[:20]}"
    nodes.append(create_node(p_id, f"Principio: {prin}", "concept", filename))
    edges.append(create_edge("homeplus", p_id, "governed_by"))

edges.append(create_edge("domain_geni", "prin_asimetría_de_coordinaci", "resolves"))

# GUARDAR
os.makedirs(os.path.dirname(GRAPH_PATH), exist_ok=True)
with open(GRAPH_PATH, "w", encoding="utf-8") as f:
    json.dump({"directed": False, "multigraph": False, "graph": {}, "nodes": nodes, "links": edges}, f, indent=2, ensure_ascii=False)

print(f"✅ Grafo Definitivo generado. Nodos: {len(nodes)} | Aristas: {len(edges)}")