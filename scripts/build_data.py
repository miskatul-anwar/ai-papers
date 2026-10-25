#!/usr/bin/env python3
"""Build structured data files for Jekyll AI Paper Library."""

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

AREA_META = {
    "01_Foundations": {
        "name": "Foundations",
        "color": "#6366f1",
        "icon": "bi-lightbulb",
        "description": "Probability, computability, information theory, logic, and early search methods that established the theoretical bedrock of AI."
    },
    "02_Neural_Networks": {
        "name": "Neural Networks",
        "color": "#ec4899",
        "icon": "bi-diagram-3",
        "description": "Early neural architectures, perceptrons, Hopfield networks, Boltzmann machines, universal approximation theorems, and backpropagation."
    },
    "03_Machine_Learning": {
        "name": "Machine Learning",
        "color": "#f59e0b",
        "icon": "bi-cpu",
        "description": "Core statistical learning algorithms, nearest neighbors, EM algorithm, SVMs, boosting, random forests, and optimization methods."
    },
    "04_Deep_Learning": {
        "name": "Deep Learning",
        "color": "#06b6d4",
        "icon": "bi-layers",
        "description": "Deep representation learning, convolutional networks, residual networks, GANs, normalizing flows, and diffusion models."
    },
    "05_NLP_Language": {
        "name": "NLP & Language",
        "color": "#10b981",
        "icon": "bi-chat-quote",
        "description": "Natural language processing evolution from ELIZA and WordNet through n-grams, word embeddings, sequence-to-sequence, and attention."
    },
    "06_Neuro_Symbolic": {
        "name": "Neuro-Symbolic",
        "color": "#8b5cf6",
        "icon": "bi-braces",
        "description": "Bridging deep neural networks with formal logic, knowledge representation, program synthesis, and symbolic reasoning."
    },
    "07_Knowledge_Graphs": {
        "name": "Knowledge Graphs",
        "color": "#0284c7",
        "icon": "bi-share",
        "description": "Ontologies, entity linking, graph embeddings (TransE, RotatE), relation extraction, and graph neural networks."
    },
    "08_Vision_Multimodal": {
        "name": "Vision & Multimodal",
        "color": "#ef4444",
        "icon": "bi-eye",
        "description": "Computer vision milestones from LeNet and AlexNet to Vision Transformers (ViT), CLIP, Stable Diffusion, and SAM."
    },
    "09_Reinforcement_Learning": {
        "name": "Reinforcement Learning",
        "color": "#84cc16",
        "icon": "bi-controller",
        "description": "Foundations of RL from actor-critic and Q-learning to DQN, A3C, PPO, AlphaGo, and modern offline/model-based RL."
    },
    "10_LLMs": {
        "name": "LLMs & Reasoning",
        "color": "#d946ef",
        "icon": "bi-stars",
        "description": "Transformer language models, BERT, GPT-2/3/4, scaling laws, instruction tuning, RLHF, chain-of-thought, and reasoning models."
    },
    "11_AI_for_Science": {
        "name": "AI for Science",
        "color": "#3b82f6",
        "icon": "bi-radioactive",
        "description": "Applying machine learning to fundamental sciences: quantum chemistry, protein folding (AlphaFold), genomics, and molecular discovery."
    },
    "12_AI_Agents": {
        "name": "AI Agents",
        "color": "#eab308",
        "icon": "bi-robot",
        "description": "Autonomous agents, tool use, web browsing, code generation, multi-agent coordination, OS interaction, and agent benchmarks."
    }
}

def format_size(bytes_val):
    if not bytes_val:
        return "0 B"
    if bytes_val >= 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.1f} MB"
    return f"{bytes_val / 1024:.0f} KB"

def make_bibtex(p):
    key = p["id"]
    title = p["title"].replace("{", "").replace("}", "")
    authors = p["authors"]
    year = p["year"]
    url = p["source_url"]
    return f"@article{{{key},\n  title = {{{title}}},\n  author = {{{authors}}},\n  year = {{{year}}},\n  url = {{{url}}}\n}}"

def main():
    with open(ROOT / "catalog.csv", encoding="utf-8") as f:
        catalog = list(csv.DictReader(f))

    with open(ROOT / "download_status.json", encoding="utf-8") as f:
        status = json.load(f)

    lp_text = (ROOT / "LEARNING_PATH.md").read_text(encoding="utf-8")

    # Parse learning path phases
    phases = []
    current_phase = None
    lp_paper_to_phase = {}

    for line in lp_text.splitlines():
        m = re.match(r"^##\s+(\d+)\.\s+(.*)", line)
        if m:
            if current_phase:
                phases.append(current_phase)
            current_phase = {
                "num": int(m.group(1)),
                "title": m.group(2).strip(),
                "description": "",
                "paper_ids": []
            }
            continue
        if current_phase:
            pm = re.search(r"library/[^/]+/\d+_([^\.]+)\.pdf", line)
            if pm:
                pid = pm.group(1)
                current_phase["paper_ids"].append(pid)
                lp_paper_to_phase[pid] = f"{current_phase['num']}. {current_phase['title']}"
            elif not current_phase["paper_ids"] and line.strip() and not line.startswith("#"):
                current_phase["description"] = (current_phase["description"] + " " + line.strip()).strip()

    if current_phase:
        phases.append(current_phase)

    # Build papers
    papers = []
    total_bytes = 0

    for row in sorted(catalog, key=lambda x: (int(x["year"]), x["id"])):
        pid = row["id"]
        st = status.get(pid, {})
        size_bytes = st.get("bytes", 0)
        total_bytes += size_bytes
        lp_phase = lp_paper_to_phase.get(pid, "")

        meta = AREA_META.get(row["area"], {
            "name": row["area"].replace("_", " "),
            "color": "#64748b",
            "icon": "bi-journal-code",
            "description": ""
        })

        paper = {
            "id": pid,
            "year": int(row["year"]),
            "area": row["area"],
            "area_name": meta["name"],
            "area_color": meta["color"],
            "area_icon": meta["icon"],
            "title": row["title"],
            "authors": row["authors"],
            "source_url": row["source_url"],
            "pdf_url": row["pdf_url"],
            "local_path": f"library/{row['area']}/{row['year']}_{row['id']}.pdf",
            "bytes": size_bytes,
            "size_human": format_size(size_bytes),
            "sha256": st.get("sha256", ""),
            "learning_path": bool(lp_phase),
            "learning_path_phase": lp_phase,
            "bibtex": make_bibtex(row)
        }
        papers.append(paper)

    # Build areas summary
    areas_list = []
    for area_id, meta in sorted(AREA_META.items()):
        area_papers = [p for p in papers if p["area"] == area_id]
        if area_papers:
            area_bytes = sum(p["bytes"] for p in area_papers)
            areas_list.append({
                "id": area_id,
                "name": meta["name"],
                "color": meta["color"],
                "icon": meta["icon"],
                "description": meta["description"],
                "count": len(area_papers),
                "bytes": area_bytes,
                "size_human": format_size(area_bytes),
                "year_min": min(p["year"] for p in area_papers),
                "year_max": max(p["year"] for p in area_papers),
                "paper_ids": [p["id"] for p in area_papers]
            })

    # Build overall stats
    stats = {
        "paper_count": len(papers),
        "area_count": len(areas_list),
        "learning_path_count": len(lp_paper_to_phase),
        "year_min": min(p["year"] for p in papers),
        "year_max": max(p["year"] for p in papers),
        "total_bytes": total_bytes,
        "total_size_human": format_size(total_bytes),
        "total_pages": 6443,
        "updated_at": "2026-10-26"
    }

    # Write data files
    data_dir = ROOT / "_data"
    data_dir.mkdir(parents=True, exist_ok=True)

    with open(data_dir / "papers.json", "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

    with open(data_dir / "areas.json", "w", encoding="utf-8") as f:
        json.dump(areas_list, f, indent=2, ensure_ascii=False)

    with open(data_dir / "learning_paths.json", "w", encoding="utf-8") as f:
        json.dump(phases, f, indent=2, ensure_ascii=False)

    with open(data_dir / "stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    # Write assets/data/papers.json for client-side search
    client_data_dir = ROOT / "assets" / "data"
    client_data_dir.mkdir(parents=True, exist_ok=True)
    with open(client_data_dir / "papers.json", "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

    print(f"Generated data files for {len(papers)} papers across {len(areas_list)} areas.")
    print(f"Total size: {stats['total_size_human']}, Learning path: {stats['learning_path_count']} papers.")

if __name__ == "__main__":
    main()
