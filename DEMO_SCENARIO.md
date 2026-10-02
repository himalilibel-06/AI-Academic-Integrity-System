# GapGuard AI Demo Scenario

A standardized presentation script and walkthrough guide for academic project evaluations, defense demonstrations, and laboratory reviews.

---

## Research Problem

"In real-world agricultural environments, computer vision models deployed on battery-powered edge hardware often fail when transitioning from clean laboratory images to uncontrolled outdoor fields. Direct sun glare, cast shadows, and specular reflections on plant foliage distort feature maps, leading to high false-positive disease detections and uncalibrated, uninterpretable spatial attributions."

---

## Research Objective

"Our objective is to develop a lightweight, edge-compatible Vision Transformer architecture that provides calibrated spatial feature attribution on foliar crop diseases under severe illumination drift, while strictly respecting edge computing and memory constraints."

---

## Research Question

"Can attention-aligned token pooling combined with post-training integer quantization preserve spatial feature attribution fidelity on resource-constrained edge accelerators under outdoor illumination drift without inflating inference latency?"

---

## Claimed Research Gap

"Existing lightweight Vision Transformers fail to provide spatially calibrated feature attribution on underrepresented foliar crop diseases under variable field illumination while maintaining edge inference budgets."

---

## Proposed Method

"We propose a cross-attention attribution pooling mechanism with contrastive token alignment and post-training 8-bit integer quantization optimized for edge hardware (such as mobile edge TPUs and microcontrollers)."

---

## Dataset / Application Context

"Evaluation is conducted on both the PlantVillage benchmark (laboratory leaf images) and the InFieldCrop-50K benchmark (uncontrolled field photographs exhibiting natural sunlight shifts, soil background clutter, and variable camera sensors)."

---

## Expected Contribution

"A hierarchical token attribution alignment method with integrated post-training quantization, achieving calibrated pixel attribution maps while reducing model parameter footprint by 45% on edge accelerators."

---

## Literature Evidence

"When we retrieve evidence from GapGuard's indexed local literature corpus, the TF-IDF search retrieves genuine peer-reviewed studies directly in our domain:
- **P001 (EdgeCropViT)**: Explores 8-bit quantized Vision Transformers for real-time plant pathology on ARM Cortex microcontrollers, noting limitations in overlapping dense canopies.
- **P002 (SolarAdapt)**: Investigates cross-farm domain adaptation under solar illumination shifts, addressing the problem of transient illumination artifacts.
- **P004 (Contrastive Attribution)**: Explores transparent attribution maps for agricultural diagnostics.

Notice that our query yields topically aligned edge AI and agricultural pathology literature, providing genuine grounding for evaluation."

---

## Gap Analysis

"We run GapGuard's Gap Analysis module on our claimed gap. The system examines five dimensions: Problem Scope, Methodology, Dataset Context, Findings, and Limitations.

Rather than claiming a 'novelty score' or declaring our idea 'revolutionary', GapGuard compares our claimed gap against the reported limitations and contributions of P001, P002, and P004. It reports a qualified status such as **Supported by Available Evidence** or **Partially Supported**, highlighting that existing literature also identifies illumination sensitivity and edge memory constraints as active bottlenecks."

---

## Contribution Differentiation

"Next, we demonstrate Contribution Differentiation. GapGuard compares our proposed research across six distinct academic dimensions:
1. Problem Scope
2. Proposed Method
3. Dataset / Application Context
4. Key Findings
5. Limitations Addressed
6. Primary Contribution

For instance, against **P001**, GapGuard identifies that while both papers explore edge quantization on PlantVillage, our study is **Partially Differentiated** because we explicitly introduce cross-attention attribution pooling for spatial interpretability. Against **P002**, our study is **Clearly Differentiated** in methodology because P002 uses adversarial gradient reversal rather than token attribution alignment."

---

## Knowledge Graph

"GapGuard constructs a deterministic Knowledge Graph connecting our study directly to the literature corpus.
The graph visualizes:
- Research Project and Manuscript nodes
- Conceptual nodes: Research Problem, Claimed Gap, Proposed Method, Dataset Context, Expected Contribution, and Evaluation Metrics
- Literature nodes: Papers, reported Findings, and documented Limitations
- Typed semantic relationships: `ADDRESSES`, `EMPLOYS`, `EVALUATES_ON`, and `CONNECTS_TO`."

---

## Search Algorithms

"On top of this Knowledge Graph, we demonstrate classic AI search algorithms:
1. **Breadth-First Search (BFS)**: Explores nodes layer-by-layer to discover the shortest conceptual hop from our Project node to a Literature Limitation node.
2. **Depth-First Search (DFS)**: Performs deep backtracking traversal across citation and methodology chains.
3. **Greedy Best-First Search**: Uses cosine semantic proximity as an educational heuristic to guide path exploration toward the goal.

*Important Note for Evaluators*: We explicitly clarify that Best-First Search uses an educational heuristic to demonstrate informed search in AI coursework; it does not constitute a guarantee of scientific truth."

---

## Rule-Based Reasoning

"We open the Reasoning Workbench to demonstrate symbolic AI:
- **Forward Chaining**: Takes our initial extracted facts (such as moderate context overlap and limitation alignment) and fires production rules to infer higher-level facts with transparent premise traces.
- **Backward Chaining**: Starts from a hypothesis such as `GAP_SUPPORTED_BY_EVIDENCE` and works backward through the rule base to verify whether the underlying conditions are satisfied."

---

## Bayesian Reasoning

"Alongside rule-based reasoning, GapGuard provides Bayesian evidence reasoning:
- It computes the posterior probability $P(\text{Gap Supported} \mid \text{Available Evidence})$ using explicit likelihood ratios.
- The interface prominently states: *'Model-based posterior estimate under configured assumptions; not global empirical truth.'*
- This demonstrates probabilistic reasoning without falsely claiming to compute real-world truth."

---

## Evidence Coverage

"In the Evidence Coverage view, we audit our paper's major claims:
1. *'Attribution alignment improves diagnostic interpretability without degrading predictive accuracy.'*
2. *'Post-training token quantization reduces parameter footprint by 45% on mobile edge accelerators.'*
3. *'Hierarchical token subsampling prevents attention collapse under field illumination variations.'*

GapGuard audits each claim sentence against the corpus excerpts, categorizing them into **Supported by Available Evidence**, **Partially Supported**, or **Insufficient Evidence**."

---

## Revision V1 → V2

"Here we demonstrate research progression between drafts:
- **Manuscript V1 (`manu-01`)**: Our initial draft proposed cross-attention pooling tested only on the clean PlantVillage laboratory dataset.
- **Manuscript V2 (`manu-02`)**: Our revised draft incorporates 8-bit post-training quantization, Edge TPU latency validation, and cross-dataset testing on the InFieldCrop-50K benchmark under outdoor sunlight shifts.

The Revision Comparison tool runs a 13-field semantic diff highlighting exact modifications in research objective, claimed gap, methodology, metrics, and quantitative claims."

---

## Faculty Review

"We log in as the Faculty Reviewer (`professor@example.com`). The professor opens our project in the Faculty Review Dashboard and provides structured qualitative comments:
- Feedback on research problem formulation
- Recommendations to validate on uncurated outdoor benchmarks
- Advice on reporting parameter count and inference latency

The professor clicks **Request Revision**, transitioning the project status to **Revision Requested**."

---

## Revision Cycle

"The Review History timeline connects every stage into a closed feedback loop:
1. **Cycle 1**: Student submits Manuscript V1 $\rightarrow$ Faculty reviews and requests revision.
2. **Cycle 2**: Student uploads Manuscript V2 addressing the feedback $\rightarrow$ Revision comparison highlights the additions $\rightarrow$ Faculty conducts follow-up review.

From the Review History timeline, clicking **Compare Revisions** opens the V1 vs V2 diff directly."

---

## Important Limitations

"During the demonstration, we emphasize GapGuard AI's core academic guardrails:
1. **Corpus Bound**: All retrieval and analysis are restricted strictly to the local development corpus (36 papers). It does not guarantee global literature coverage.
2. **Advisory Decision Support**: GapGuard assists human researchers and faculty reviewers. It does not replace peer review.
3. **No Automated Decisions**: The system generates zero pass/fail scores, zero acceptance probabilities, and zero automated academic judgments.
4. **Heuristic Nature**: The search and Bayesian models demonstrate AI concepts; their outputs are model estimates under transparent assumptions, not scientific absolutes."
