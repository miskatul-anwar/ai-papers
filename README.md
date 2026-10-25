# AI Paper Library (1763–2026)

[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-4f46e5?style=for-the-badge&logo=github)](https://miskatul-anwar.github.io/ai-papers/)
[![Papers](https://img.shields.io/badge/Curated%20Papers-217-10b981?style=for-the-badge)](https://miskatul-anwar.github.io/ai-papers/)
[![Timeline](https://img.shields.io/badge/Chronological%20Timeline-1763--2026-f59e0b?style=for-the-badge)](https://miskatul-anwar.github.io/ai-papers/timeline.html)
[![Storage](https://img.shields.io/badge/Archive%20Size-783%20MiB-0284c7?style=for-the-badge)](https://miskatul-anwar.github.io/ai-papers/)
[![Integrity](https://img.shields.io/badge/Integrity-100%25%20SHA--256-6366f1?style=for-the-badge)](https://miskatul-anwar.github.io/ai-papers/about.html)

An open, comprehensive, curated collection of 217 landmark research papers in artificial intelligence, machine learning, neural networks, deep learning, NLP, knowledge graphs, neuro-symbolic AI, reinforcement learning, multimodal AI, LLMs, and autonomous agents spanning 1763 to 2026.

Every paper is hosted in full with a verified, downloadable PDF, cryptographic SHA-256 checksum, DOI citations, and an interactive reading interface.

🌐 **Live Website:** [https://miskatul-anwar.github.io/ai-papers/](https://miskatul-anwar.github.io/ai-papers/)

---

## 🧭 Web Application Features

- **🏛️ Archival Homepage:** Editorial monograph featuring essential landmark milestones, historical epochs, and instant search.
- **⚡ Instant Search & Multi-Filter:** Sub-millisecond client-side filtering across titles, authors, years, categories, and IDs on the [Catalog](https://miskatul-anwar.github.io/ai-papers/catalog.html).
- **📖 In-Browser PDF Reader:** Read any paper immediately in a modal viewer or download for offline reading.
- **⏳ Chronological Timeline (1763–2026):** Visual vertical timeline from Thomas Bayes (1763) and Alan Turing (1936, 1950) to frontier agentic architectures of 2026.
- **📚 Curated Subject Areas:** 12 thematic areas from neural foundations and deep learning to multi-agent systems.
- **🏷️ BibTeX Citation Export:** One-click copyable citations for all 217 papers.
- **🌓 Dark & Light Mode:** Optimized for comfortable reading on all devices.

---

## 🗂️ Subject Areas

| Area | Category Name | Papers | Time Span | Key Milestones |
|---|---|---|---|---|
| **01** | Foundations | 16 | 1763–1976 | Bayes (1763), Turing (1936, 1950), Shannon (1948), Dartmouth (1955), STRIPS (1971) |
| **02** | Neural Networks | 10 | 1958–1989 | Perceptron (1958), Hopfield (1982), Backprop (1986), Universal Approximation (1989) |
| **03** | Machine Learning | 18 | 1901–2014 | Pearson PCA (1901), Nearest Neighbors (1967), EM (1977), SVM (1995), Random Forests (2001), Adam (2014) |
| **04** | Deep Learning | 20 | 2006–2022 | Deep Belief Nets (2006), Dropout (2014), GANs (2014), ResNet (2015), DDPM (2020), Flow Matching (2022) |
| **05** | NLP & Language | 20 | 1966–2020 | ELIZA (1966), WordNet (1995), Word2Vec (2013), Seq2Seq (2014), Transformer (2017), T5 (2020) |
| **06** | Neuro-Symbolic | 15 | 2015–2025 | Neural Theorem Prover (2017), DeepProbLog (2018), AlphaGeometry (2024), Unified NeuroSym (2025) |
| **07** | Knowledge Graphs | 21 | 2007–2024 | YAGO (2007), TransE (2013), Knowledge Vault (2014), RotatE (2019), Ultra (2024) |
| **08** | Vision & Multimodal | 21 | 1980–2024 | Neocognitron (1980), LeNet (1998), AlexNet (2012), ViT (2020), CLIP (2021), Stable Diffusion (2021), SAM (2023) |
| **09** | Reinforcement Learning | 16 | 1983–2020 | Actor-Critic (1983), Q-Learning (1992), Policy Gradient (1999), DQN (2015), AlphaGo (2016), PPO (2017) |
| **10** | LLMs & Reasoning | 36 | 2018–2026 | GPT-2/3/4, BERT (2018), Scaling Laws (2020), Chinchilla (2022), InstructGPT (2022), LLaMA (2023), Gemini 2.5 (2025) |
| **11** | AI for Science | 8 | 2017–2025 | SchNet (2017), AlphaFold 1 & 2 (2020), RFdiffusion (2023), AlphaGenome (2025) |
| **12** | AI Agents & Tool Use | 16 | 2022–2026 | ReAct (2022), Toolformer (2023), Voyager (2023), OSWorld (2024), AI Scientist (2024), OSWorld 2 (2026) |

---

## 🛠️ Local Download and Audit

The entire library can be verified and audited using standard Python (3.10+) with zero external dependencies:

```bash
# Verify all 217 papers are present, valid PDFs, and match checksums:
python paper_library.py verify

# Check current catalog status:
python paper_library.py status

# Regenerate INDEX.md and TIMELINE.md from catalog.csv:
python paper_library.py index
```

---

## 🚀 Running Locally with Jekyll

To preview the website locally:

```bash
bundle install
bundle exec jekyll serve
# Open http://localhost:4000/ai-papers/ in your browser
```

Or preview the static site instantly with Python:

```bash
python3 -m http.server 8000
# Open http://localhost:8000/ in your browser
```

---

## 📄 License & Attribution

All papers belong to their respective authors and publishers. Links to official DOI resolvers and project landing pages are provided in `catalog.csv` and on each paper's card. This repository is maintained for educational and scientific research purposes.
