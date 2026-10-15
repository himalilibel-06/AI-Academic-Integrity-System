"""
LU IV — Concept 10: Bayesian Networks (Exact Inference via Variable Elimination)

Implements:
- Directed Acyclic Graph (DAG) with topological cycle detection
- Conditional Probability Tables (CPTs) at each node
- Factor representation and factor operations:
    1. Slicing on observed evidence
    2. Factor multiplication (join)
    3. Factor marginalization (summing out hidden variables)
    4. Normalization to produce exact posterior P(Query | Evidence)
- Canonical 5-Node Academic Integrity Network
- Step-by-step Variable Elimination trace logs
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import itertools


class Factor:
    """
    A multi-dimensional discrete potential table over a subset of variables.
    Variables is a list of variable names.
    Values is a dictionary mapping assignment tuple -> float probability.
    """

    def __init__(
        self,
        variables: List[str],
        var_domains: Dict[str, List[str]],
        table: Optional[Dict[Tuple[str, ...], float]] = None,
    ):
        self.variables = list(variables)
        self.var_domains = var_domains
        self.table: Dict[Tuple[str, ...], float] = table or {}

    def slice_evidence(self, evidence: Dict[str, str]) -> "Factor":
        """
        Conditions factor on observed evidence:
        Keeps rows matching evidence, and projects away the evidence variables.
        """
        active_evidence = {k: v for k, v in evidence.items() if k in self.variables}
        if not active_evidence:
            return Factor(self.variables, self.var_domains, dict(self.table))

        remaining_vars = [v for v in self.variables if v not in active_evidence]
        new_table: Dict[Tuple[str, ...], float] = {}

        for assignment, val in self.table.items():
            matches = True
            for ev_var, ev_val in active_evidence.items():
                idx = self.variables.index(ev_var)
                if assignment[idx] != ev_val:
                    matches = False
                    break
            if matches:
                if remaining_vars:
                    reduced_key = tuple(assignment[self.variables.index(v)] for v in remaining_vars)
                else:
                    reduced_key = ()
                new_table[reduced_key] = new_table.get(reduced_key, 0.0) + val

        return Factor(remaining_vars, self.var_domains, new_table)

    def multiply(self, other: "Factor") -> "Factor":
        """
        Pointwise factor multiplication: psi(X, Y) * phi(Y, Z) = chi(X, Y, Z).
        Correctly handles scalar factors (empty variable lists).
        """
        if not self.variables:
            scalar = self.table.get((), 1.0)
            return Factor(other.variables, other.var_domains, {k: v * scalar for k, v in other.table.items()})

        if not other.variables:
            scalar = other.table.get((), 1.0)
            return Factor(self.variables, self.var_domains, {k: v * scalar for k, v in self.table.items()})

        union_vars = list(self.variables)
        for v in other.variables:
            if v not in union_vars:
                union_vars.append(v)

        # Generate all combined Cartesian product states
        domains = [self.var_domains[v] for v in union_vars]
        new_table: Dict[Tuple[str, ...], float] = {}

        for combo in itertools.product(*domains):
            assignment_dict = {union_vars[i]: combo[i] for i in range(len(union_vars))}

            # Project onto self
            self_key = tuple(assignment_dict[v] for v in self.variables)
            # Project onto other
            other_key = tuple(assignment_dict[v] for v in other.variables)

            val1 = self.table.get(self_key, 0.0)
            val2 = other.table.get(other_key, 0.0)
            new_table[combo] = val1 * val2

        return Factor(union_vars, self.var_domains, new_table)

    def marginalize(self, var_to_sum_out: str) -> "Factor":
        """
        Sums out a variable: sum_Y chi(X, Y, Z) = tau(X, Z).
        """
        if var_to_sum_out not in self.variables:
            return self

        remaining_vars = [v for v in self.variables if v != var_to_sum_out]
        if not remaining_vars:
            # All variables summed out: returns scalar factor
            scalar_sum = sum(self.table.values())
            return Factor([], self.var_domains, {(): scalar_sum})

        sum_idx = self.variables.index(var_to_sum_out)
        new_table: Dict[Tuple[str, ...], float] = {}

        for assignment, val in self.table.items():
            reduced_key = tuple(assignment[i] for i in range(len(assignment)) if i != sum_idx)
            new_table[reduced_key] = new_table.get(reduced_key, 0.0) + val

        return Factor(remaining_vars, self.var_domains, new_table)

    def normalize(self) -> "Factor":
        """Normalizes the table so probabilities sum to 1.0."""
        total = sum(self.table.values())
        if total <= 0:
            return self
        normalized_table = {k: round(v / total, 6) for k, v in self.table.items()}
        return Factor(self.variables, self.var_domains, normalized_table)

    def to_dict(self) -> Dict[str, Any]:
        rows = []
        for assignment, val in self.table.items():
            row = {self.variables[i]: assignment[i] for i in range(len(self.variables))}
            row["value"] = round(val, 6)
            rows.append(row)
        return {
            "variables": self.variables,
            "rows": rows,
        }


class BayesianNetwork:
    """
    Directed Acyclic Graph (DAG) Bayesian Network with CPTs at each node
    and exact inference via Variable Elimination.
    """

    def __init__(self):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.domains: Dict[str, List[str]] = {}
        self.cpts: Dict[str, Factor] = {}
        self.edges: List[Tuple[str, str]] = []

    def add_node(self, name: str, domain: List[str], parents: Optional[List[str]] = None) -> None:
        parents = parents or []
        self.nodes[name] = {
            "name": name,
            "domain": domain,
            "parents": parents,
            "children": [],
        }
        self.domains[name] = domain
        for p in parents:
            self.edges.append((p, name))
            if p in self.nodes:
                self.nodes[p]["children"].append(name)

        # Check for cycles
        if not self._is_dag():
            raise ValueError(f"Adding edge to node '{name}' creates a cycle in the Bayesian Network!")

    def set_cpt(self, node: str, cpt_table: Dict[Tuple[str, ...], float]) -> None:
        """
        Sets Conditional Probability Table for node.
        Keys in cpt_table are tuples: (*parent_values, node_value)
        """
        parents = self.nodes[node]["parents"]
        factor_vars = parents + [node]
        self.cpts[node] = Factor(factor_vars, self.domains, cpt_table)

    def _is_dag(self) -> bool:
        """Validates that graph contains no directed cycles using Kahn's topological sort."""
        in_degree = {n: len(self.nodes[n]["parents"]) for n in self.nodes}
        queue = [n for n, deg in in_degree.items() if deg == 0]
        visited_count = 0

        while queue:
            node = queue.pop(0)
            visited_count += 1
            for child in self.nodes[node]["children"]:
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        return visited_count == len(self.nodes)

    def variable_elimination(
        self,
        query_var: str,
        evidence: Optional[Dict[str, str]] = None,
        elimination_order: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Exact Variable Elimination Algorithm:
        1. Initialize factors from each CPT.
        2. Condition (slice) factors with observed evidence.
        3. Eliminate non-query, non-evidence hidden variables one by one:
           - Multiply all factors containing Z.
           - Sum out Z.
        4. Multiply remaining factors containing query variable.
        5. Normalize query distribution.
        """
        evidence = evidence or {}
        if query_var not in self.nodes:
            raise ValueError(f"Query variable '{query_var}' not found in Bayesian Network.")

        trace: List[Dict[str, Any]] = []

        # 1. Initialize factors & slice evidence
        active_factors: List[Factor] = []
        for node_name, cpt_factor in self.cpts.items():
            sliced = cpt_factor.slice_evidence(evidence)
            active_factors.append(sliced)

        trace.append({
            "stage": "EVIDENCE_CONDITIONING",
            "evidence": evidence,
            "message": f"Conditioned {len(active_factors)} CPT factors on observed evidence.",
        })

        # 2. Determine hidden variables to eliminate
        hidden_vars = [v for v in self.nodes if v != query_var and v not in evidence]
        order = elimination_order or hidden_vars

        for var_to_eliminate in order:
            if var_to_eliminate not in hidden_vars:
                continue

            # Find all factors containing var_to_eliminate
            relevant_factors = [f for f in active_factors if var_to_eliminate in f.variables]
            other_factors = [f for f in active_factors if var_to_eliminate not in f.variables]

            if not relevant_factors:
                continue

            # Pointwise multiply relevant factors
            product_factor = relevant_factors[0]
            for f in relevant_factors[1:]:
                product_factor = product_factor.multiply(f)

            # Marginalize (sum out) var_to_eliminate
            marginalized_factor = product_factor.marginalize(var_to_eliminate)
            active_factors = other_factors + [marginalized_factor]

            trace.append({
                "stage": "VARIABLE_ELIMINATION_STEP",
                "eliminated_variable": var_to_eliminate,
                "multiplied_factor_vars": product_factor.variables,
                "marginalized_factor_vars": marginalized_factor.variables,
            })

        # 3. Multiply remaining factors
        if not active_factors:
            raise RuntimeError("No active factors remaining for query variable.")

        final_product = active_factors[0]
        for f in active_factors[1:]:
            final_product = final_product.multiply(f)

        # 4. Normalize
        normalized_query = final_product.normalize()

        # Format output distribution
        posterior_distribution: Dict[str, float] = {}
        for row_tuple, prob in normalized_query.table.items():
            if normalized_query.variables and query_var in normalized_query.variables:
                val = row_tuple[normalized_query.variables.index(query_var)]
                posterior_distribution[val] = round(posterior_distribution.get(val, 0.0) + prob, 4)
            else:
                posterior_distribution["value"] = round(prob, 4)

        trace.append({
            "stage": "NORMALIZATION_COMPLETE",
            "query_variable": query_var,
            "distribution": posterior_distribution,
        })

        return {
            "query_variable": query_var,
            "evidence": evidence,
            "elimination_order": order,
            "posterior_distribution": posterior_distribution,
            "trace": trace,
            "factor_table": normalized_query.to_dict(),
        }

    @classmethod
    def build_academic_integrity_network(cls) -> "BayesianNetwork":
        """
        Canonical 5-Node Academic Integrity Bayesian Network:
            Difficulty (D) -> Cheating (C)
            Pressure (P)   -> Cheating (C)
            Cheating (C)   -> HighOverlap (O)
            Cheating (C)   -> CitationAnomaly (I)
        """
        bn = cls()

        # 1. Add nodes with discrete binary domains
        bn.add_node("Difficulty", ["Low", "High"])
        bn.add_node("Pressure", ["Low", "High"])
        bn.add_node("Cheating", ["True", "False"], parents=["Difficulty", "Pressure"])
        bn.add_node("HighOverlap", ["True", "False"], parents=["Cheating"])
        bn.add_node("CitationAnomaly", ["True", "False"], parents=["Cheating"])

        # 2. CPT for Difficulty P(D)
        bn.set_cpt("Difficulty", {
            ("Low",): 0.60,
            ("High",): 0.40,
        })

        # 3. CPT for Pressure P(P)
        bn.set_cpt("Pressure", {
            ("Low",): 0.70,
            ("High",): 0.30,
        })

        # 4. CPT for Cheating P(C | D, P): keys are (D, P, C)
        bn.set_cpt("Cheating", {
            ("Low", "Low", "True"): 0.02,
            ("Low", "Low", "False"): 0.98,
            ("Low", "High", "True"): 0.15,
            ("Low", "High", "False"): 0.85,
            ("High", "Low", "True"): 0.08,
            ("High", "Low", "False"): 0.92,
            ("High", "High", "True"): 0.35,
            ("High", "High", "False"): 0.65,
        })

        # 5. CPT for HighOverlap P(O | C): keys are (C, O)
        bn.set_cpt("HighOverlap", {
            ("True", "True"): 0.85,
            ("True", "False"): 0.15,
            ("False", "True"): 0.05,
            ("False", "False"): 0.95,
        })

        # 6. CPT for CitationAnomaly P(I | C): keys are (C, I)
        bn.set_cpt("CitationAnomaly", {
            ("True", "True"): 0.75,
            ("True", "False"): 0.25,
            ("False", "True"): 0.08,
            ("False", "False"): 0.92,
        })

        return bn

    def to_dict(self) -> Dict[str, Any]:
        """Returns network topology and CPT representations."""
        return {
            "nodes": [
                {
                    "name": name,
                    "domain": data["domain"],
                    "parents": data["parents"],
                    "children": data["children"],
                    "cpt_table": self.cpts[name].to_dict() if name in self.cpts else {},
                }
                for name, data in self.nodes.items()
            ],
            "edges": [{"from": p, "to": c} for p, c in self.edges],
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
        }
