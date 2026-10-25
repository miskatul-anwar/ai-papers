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

AREA_TO_PHASE = {
    "01_Foundations": 1,
    "02_Neural_Networks": 4,
    "03_Machine_Learning": 3,
    "04_Deep_Learning": 4,
    "05_NLP_Language": 5,
    "06_Neuro_Symbolic": 6,
    "07_Knowledge_Graphs": 6,
    "08_Vision_Multimodal": 8,
    "09_Reinforcement_Learning": 7,
    "10_LLMs": 9,
    "11_AI_for_Science": 10,
    "12_AI_Agents": 11
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
    phases_raw = []
    current_phase = None
    lp_paper_to_phase = {}

    for line in lp_text.splitlines():
        m = re.match(r"^##\s+(\d+)\.\s+(.*)", line)
        if m:
            if current_phase:
                phases_raw.append(current_phase)
            current_phase = {
                "num": int(m.group(1)),
                "title": m.group(2).strip(),
                "description": "",
                "curriculum_ids": []
            }
            continue
        if current_phase:
            pm = re.search(r"library/[^/]+/\d+_([^\.]+)\.pdf", line)
            if pm:
                pid = pm.group(1)
                current_phase["curriculum_ids"].append(pid)
                lp_paper_to_phase[pid] = current_phase["num"]
            elif not current_phase["curriculum_ids"] and line.strip() and not line.startswith("#"):
                current_phase["description"] = (current_phase["description"] + " " + line.strip()).strip()

    if current_phase:
        phases_raw.append(current_phase)

    # Build papers
    papers = []
    total_bytes = 0

    for row in sorted(catalog, key=lambda x: (int(x["year"]), x["id"])):
        pid = row["id"]
        st = status.get(pid, {})
        size_bytes = st.get("bytes", 0)
        total_bytes += size_bytes

        # Determine phase number
        if pid in lp_paper_to_phase:
            phase_num = lp_paper_to_phase[pid]
            is_curriculum = True
        else:
            is_curriculum = False
            phase_num = AREA_TO_PHASE.get(row["area"], 1)
            if row["area"] == "01_Foundations" and int(row["year"]) >= 1955:
                phase_num = 2

        meta = AREA_META.get(row["area"], {
            "name": row["area"].replace("_", " "),
            "color": "#64748b",
            "icon": "bi-journal-code",
            "description": ""
        })

        phase_match = next((p for p in phases_raw if p["num"] == phase_num), None)
        phase_title = f"{phase_num}. {phase_match['title']}" if phase_match else f"Phase {phase_num}"

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
            "learning_path": is_curriculum,
            "phase_num": phase_num,
            "phase_title": phase_title,
            "bibtex": make_bibtex(row)
        }
        papers.append(paper)

    # Build merged phases structure
    phases = []
    for praw in phases_raw:
        pnum = praw["num"]
        phase_papers = [p for p in papers if p["phase_num"] == pnum]
        phase_papers.sort(key=lambda x: (x["year"], x["id"]))

        curriculum_ids = [p["id"] for p in phase_papers if p["learning_path"]]
        all_ids = [p["id"] for p in phase_papers]

        y_min = min(p["year"] for p in phase_papers) if phase_papers else 0
        y_max = max(p["year"] for p in phase_papers) if phase_papers else 0

        phases.append({
            "num": pnum,
            "title": praw["title"],
            "description": praw["description"],
            "curriculum_ids": curriculum_ids,
            "all_ids": all_ids,
            "year_min": y_min,
            "year_max": y_max,
            "total_count": len(all_ids),
            "curriculum_count": len(curriculum_ids)
        })

    # Build timeline eras
    def get_era_info(y):
        if y < 1950: return ("pre-1950", "Pre-1950: Foundations of Computation & Probability")
        if y < 1960: return ("1950s", "1950s: The Birth of Artificial Intelligence")
        if y < 1970: return ("1960s", "1960s: Early Logic, Search & Pattern Classification")
        if y < 1980: return ("1970s", "1970s: Expert Systems & Knowledge Representation")
        if y < 1990: return ("1980s", "1980s: Connectionism & Neural Resurgence")
        if y < 2000: return ("1990s", "1990s: Statistical Learning, SVMs & Embeddings")
        if y < 2010: return ("2000s", "2000s: Graphs, Topic Models & Early Deep Nets")
        if y < 2020: return ("2010s", "2010s: Deep Learning & the Transformer Revolution")
        return ("2020s", "2020s: Large Language Models & Autonomous Agents")

    era_order = ["pre-1950", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]
    eras_dict = {eid: {"id": eid, "title": "", "papers": []} for eid in era_order}

    for p in papers:
        eid, title = get_era_info(p["year"])
        eras_dict[eid]["title"] = title
        eras_dict[eid]["papers"].append(p)

    timeline_list = []
    for eid in era_order:
        edata = eras_dict[eid]
        if edata["papers"]:
            y_min = min(p["year"] for p in edata["papers"])
            y_max = max(p["year"] for p in edata["papers"])
            timeline_list.append({
                "id": eid,
                "title": edata["title"],
                "year_range": f"{y_min}–{y_max}" if y_min != y_max else str(y_min),
                "count": len(edata["papers"]),
                "papers": edata["papers"]
            })

    # Build areas summary
    areas_list = []
    for area_id, meta in sorted(AREA_META.items()):
        area_papers = [p for p in papers if p["area"] == area_id]
        if area_papers:
            area_bytes = sum(p["bytes"] for p in area_papers)
            milestones = [{
                "id": p["id"],
                "year": p["year"],
                "title": p["title"],
                "local_path": p["local_path"]
            } for p in area_papers[:3]]
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
                "paper_ids": [p["id"] for p in area_papers],
                "milestones": milestones
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

    with open(data_dir / "timeline.json", "w", encoding="utf-8") as f:
        json.dump(timeline_list, f, indent=2, ensure_ascii=False)

    with open(data_dir / "learning_paths.json", "w", encoding="utf-8") as f:
        json.dump(phases, f, indent=2, ensure_ascii=False)

    with open(data_dir / "stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    # Landmarks data for Homepage
    landmarks_spec = [
        {"id": "bayes1763", "significance": "Introduces inverse probability and Bayes’ Theorem, establishing the foundation of probabilistic reasoning and Bayesian statistical learning."},
        {"id": "shannon1948", "significance": "Foundational treatise creating information theory, mathematically defining entropy, channel capacity, and discrete information quantification."},
        {"id": "turing1950", "significance": "Introduces the Imitation Game (Turing Test) and articulates the fundamental philosophy, arguments, and prospect of artificial machine intelligence."},
        {"id": "rumelhart1986", "significance": "Demonstrates generalized backpropagation for multi-layer neural networks, solving the non-linear representation problem and catalyzing connectionism."},
        {"id": "lstm1997", "significance": "Invents the constant error carousel and gating mechanism to eliminate vanishing gradients in recurrent networks, enabling long-range sequence modeling."},
        {"id": "alexnet2012", "significance": "Wins ImageNet 2012 by an unprecedented margin using deep convolutional networks on GPUs with ReLU and dropout, sparking modern deep learning."},
        {"id": "transformer2017", "significance": "Dispenses with recurrence and convolutions entirely, introducing multi-head self-attention that became the universal backbone for modern foundation models."},
        {"id": "gpt3_2020", "significance": "Demonstrates that massive scaling of autoregressive Transformers produces emergent few-shot learning and in-context task execution without gradient updates."},
        {"id": "react2022", "significance": "Synergizes verbal reasoning traces with external tool actions, establishing the foundational architecture for autonomous language model agents."},
        {"id": "deepseek_r1_2025", "significance": "Demonstrates large-scale pure reinforcement learning without supervised cold-start data to elicit emergent deep reasoning and self-verification in LLMs."}
    ]
    papers_by_id = {p["id"]: p for p in papers}
    landmarks_data = []
    for s in landmarks_spec:
        if s["id"] in papers_by_id:
            p = papers_by_id[s["id"]]
            landmarks_data.append({
                "id": p["id"],
                "year": p["year"],
                "area": p["area"],
                "area_name": p["area_name"],
                "title": p["title"],
                "authors": p["authors"],
                "local_path": p["local_path"],
                "source_url": p["source_url"],
                "size_human": p["size_human"],
                "significance": s["significance"]
            })
    with open(data_dir / "landmarks.json", "w", encoding="utf-8") as f:
        json.dump(landmarks_data, f, indent=2, ensure_ascii=False)

    # Quotes data for Homepage
    quotes_spec = [
        {"id": "turing1950", "theme": "The Horizon of Machine Thought", "quote": "We may hope that machines will eventually compete with men in all purely intellectual fields. But which are the best ones to start with? Even this is a difficult decision... We can only see a short distance ahead, but we can see plenty there that needs to be done.", "author": "Alan M. Turing", "paper_id": "turing1950", "year": 1950, "context": "From the concluding section of Computing Machinery and Intelligence, defining the roadmap toward trainable artificial minds."},
        {"id": "shannon1948", "theme": "The Mathematical Essence of Information", "quote": "The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point. Frequently the messages have meaning... these semantic aspects of communication are irrelevant to the engineering problem.", "author": "Claude E. Shannon", "paper_id": "shannon1948", "year": 1948, "context": "The opening thesis of A Mathematical Theory of Communication, which laid the mathematical groundwork for digital computing, entropy, and statistical learning."},
        {"id": "dartmouth1955", "theme": "The Founding Conjecture of AI", "quote": "The study is to proceed on the basis of the conjecture that every aspect of learning or any other feature of intelligence can in principle be so precisely described that a machine can be made to simulate it.", "author": "John McCarthy, Marvin Minsky, Nathaniel Rochester & Claude Shannon", "paper_id": "dartmouth1955", "year": 1955, "context": "The 1955 workshop proposal that formally christened the field of Artificial Intelligence at Dartmouth College."},
        {"id": "rumelhart1986", "theme": "Distributed Representation & Learning", "quote": "The representation of concepts by patterns of activity over many units allows the network to generalize to new cases in a natural way... and generalized backpropagation provides the credit-assignment mechanism required to learn internal representations.", "author": "David Rumelhart, Geoffrey Hinton & Ronald Williams", "paper_id": "rumelhart1986", "year": 1986, "context": "Published in Nature, demonstrating that multi-layer neural networks can learn arbitrary non-linear mappings via gradient descent."},
        {"id": "transformer2017", "theme": "The Architecture of Modern Intelligence", "quote": "We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output... Attention is all you need.", "author": "Ashish Vaswani, Noam Shazeer, Niki Parmar, et al.", "paper_id": "transformer2017", "year": 2017, "context": "The seminal NeurIPS 2017 paper that replaced recurrent neural networks with self-attention, establishing the backbone for all modern LLMs."},
        {"id": "gpt3_2020", "theme": "Emergent In-Context Intelligence", "quote": "Scaling up language models greatly improves task-agnostic, few-shot performance, demonstrating that massive autoregressive pretraining allows models to perform diverse tasks with zero gradient updates.", "author": "Tom B. Brown, Benjamin Mann, Nick Ryder, et al.", "paper_id": "gpt3_2020", "year": 2020, "context": "Language Models are Few-Shot Learners, introducing GPT-3 (175B parameters) and proving scaling laws produce emergent few-shot capabilities."},
        {"id": "react2022", "theme": "The Frontier of Autonomous Action", "quote": "While reasoning traces help models induce, track, and update action plans, action execution interfaces with external knowledge sources. Synergizing reasoning and acting creates agents that think, act, and observe in closed loops.", "author": "Shunyu Yao, Jeffrey Zhao, Dian Yu, et al.", "paper_id": "react2022", "year": 2022, "context": "ReAct: Synergizing Reasoning and Acting in Language Models, establishing the architecture that powers modern autonomous agent frameworks."},
        {"id": "deepseek_r1_2025", "theme": "Pure Autonomous Reasoning", "quote": "Large-scale reinforcement learning applied directly to base models without supervised cold-start data demonstrates that reasoning capabilities can emerge purely through autonomous exploration, self-verification, and reward incentives.", "author": "DeepSeek-AI", "paper_id": "deepseek_r1_2025", "year": 2025, "context": "DeepSeek-R1, demonstrating that pure RL elicits long-chain reasoning, self-correction, and reflective thought without human demonstration data."}
    ]
    quotes_data = []
    for q in quotes_spec:
        if q["paper_id"] in papers_by_id:
            p = papers_by_id[q["paper_id"]]
            q["paper_title"] = p["title"]
            q["local_path"] = p["local_path"]
            q["area_name"] = p["area_name"]
            q["size_human"] = p["size_human"]
            quotes_data.append(q)
    with open(data_dir / "quotes.json", "w", encoding="utf-8") as f:
        json.dump(quotes_data, f, indent=2, ensure_ascii=False)

    # Dossiers data for Homepage
    dossiers_spec = [
        {
            "id": "roots", "num": "I", "title": "The Epistemological Roots",
            "subtitle": "Probability, Computation & Information Theory", "time_span": "1763–1950",
            "summary": "Before neural architectures and gradient descent existed, mathematics and formal logic established the fundamental boundaries of what can be computed, communicated, and inferred from uncertain evidence.",
            "paper_ids": ["bayes1763", "shannon1948", "turing1950"]
        },
        {
            "id": "connectionism", "num": "II", "title": "The Connectionist Crucible",
            "subtitle": "From Single Perceptrons to Deep Representations", "time_span": "1958–2012",
            "summary": "The multi-decade quest to build trainable distributed representations: overcoming linear separability with generalized backpropagation, solving sequence memory with LSTM, and unlocking GPU-scale vision with AlexNet.",
            "paper_ids": ["rosenblatt1958", "rumelhart1986", "lstm1997", "alexnet2012"]
        },
        {
            "id": "transformers", "num": "III", "title": "The Transformer Revolution",
            "subtitle": "Self-Attention, Scaling Laws & In-Context Reasoning", "time_span": "2017–2025",
            "summary": "How dispensing with recurrence in favor of multi-head attention unlocked unprecedented parallel scaling, turning massive autoregressive pretraining into a universal in-context generalizer and autonomous reasoning engine.",
            "paper_ids": ["transformer2017", "gpt3_2020", "deepseek_r1_2025"]
        },
        {
            "id": "agents", "num": "IV", "title": "The Frontier of Autonomous Agents",
            "subtitle": "Reasoning Traces, Tool Use & Closed-Loop Simulation", "time_span": "2022–2024",
            "summary": "The leap from passive sequence prediction to embodied and digital agency: models that verbalize rationale, invoke external tool APIs, update internal memory, and coordinate in multi-agent environments.",
            "paper_ids": ["react2022", "toolformer2023", "generative_agents_2023", "voyager_2023"]
        }
    ]
    dossiers_data = []
    for d in dossiers_spec:
        d_item = {
            "id": d["id"], "num": d["num"], "title": d["title"],
            "subtitle": d["subtitle"], "time_span": d["time_span"],
            "summary": d["summary"], "papers": []
        }
        for pid in d["paper_ids"]:
            if pid in papers_by_id:
                p = papers_by_id[pid]
                d_item["papers"].append({
                    "id": p["id"], "year": p["year"], "title": p["title"],
                    "authors": p["authors"], "local_path": p["local_path"],
                    "size_human": p["size_human"]
                })
        dossiers_data.append(d_item)
    with open(data_dir / "dossiers.json", "w", encoding="utf-8") as f:
        json.dump(dossiers_data, f, indent=2, ensure_ascii=False)

    # Write assets/data/papers.json for client-side search
    client_data_dir = ROOT / "assets" / "data"
    client_data_dir.mkdir(parents=True, exist_ok=True)
    with open(client_data_dir / "papers.json", "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

    print(f"Generated data files for {len(papers)} papers across {len(phases)} phases and {len(areas_list)} areas.")

if __name__ == "__main__":
    main()
