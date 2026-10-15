"""
GapGuard AI — Educational Graph Search Algorithms Service

Implements classical AI search algorithms over the Research Knowledge Graph:
1. BFS (Breadth-First Search): Queue-based exhaustive level-by-level exploration.
2. DFS (Depth-First Search): Stack-based deep branch exploration.
3. Best-First Search: Greedy heuristic-driven priority traversal using explicit
   lexical and structural similarity to the goal node.

All search algorithms expose:
- start node and goal node
- complete visited order
- discovered path and path length
- step-by-step explainability with relationship tracking
- explicit heuristic values for Best-First Search
"""

from collections import deque
import heapq
import re
from typing import Any, Dict, List, Optional, Set, Tuple


STOPWORDS = {
    "the", "a", "an", "in", "on", "at", "for", "with", "about", "against", "between",
    "into", "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should",
    "and", "but", "if", "or", "because", "as", "until", "while", "this", "that",
    "these", "those", "we", "our", "us", "paper", "study", "propose", "method", "using",
}


def _tokenize(text: str) -> Set[str]:
    """Tokenize and remove stop words deterministically."""
    if not text:
        return set()
    tokens = re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", text.lower())
    return {t for t in tokens if t not in STOPWORDS}


def _node_text_representation(node: Dict[str, Any]) -> str:
    """Extract full textual representation of a node for heuristic computation."""
    parts = [node.get("label", ""), node.get("type", "")]
    attrs = node.get("attributes", {})
    if isinstance(attrs, dict):
        for k, v in attrs.items():
            if isinstance(v, (str, int, float)):
                parts.append(str(v))
            elif isinstance(v, list):
                parts.extend([str(item) for item in v if isinstance(item, (str, int, float))])
    return " ".join(parts)


def compute_heuristic(
    current_node: Dict[str, Any],
    goal_node: Dict[str, Any],
    direct_neighbors: Optional[Set[str]] = None,
) -> float:
    """
    Explicit, deterministic heuristic distance h(n) from current_node to goal_node.

    h(n) represents estimated distance/cost to the goal:
    - h(goal) = 0.0
    - If current_node is a direct neighbor of goal_node: h(n) = 0.10
    - If lexical overlap exists: h(n) = max(0.15, round(1.0 - dice_similarity, 3))
    - If same source domain/category: h(n) = 0.70
    - Otherwise (no apparent lexical/structural link): h(n) = 1.00

    Returns:
        float in [0.0, 1.0], where lower means closer / more relevant to the goal.
    """
    if current_node.get("id") == goal_node.get("id"):
        return 0.0

    if direct_neighbors and goal_node.get("id") in direct_neighbors:
        return 0.10

    curr_tokens = _tokenize(_node_text_representation(current_node))
    goal_tokens = _tokenize(_node_text_representation(goal_node))

    if curr_tokens and goal_tokens:
        common = curr_tokens.intersection(goal_tokens)
        if common:
            dice = (2.0 * len(common)) / (len(curr_tokens) + len(goal_tokens))
            return round(max(0.15, 1.0 - dice), 3)

    if current_node.get("source") == goal_node.get("source"):
        return 0.70

    return 1.00


class GraphSearchService:
    """
    Service running BFS, DFS, and Best-First Search over a research knowledge graph.
    """

    @staticmethod
    def _build_adjacency(
        nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
        """
        Build node lookup and bidirectional adjacency list from graph edges.
        """
        node_map = {n["id"]: n for n in nodes}
        adj: Dict[str, List[Dict[str, Any]]] = {n["id"]: [] for n in nodes}

        for edge in edges:
            src = edge["source"]
            tgt = edge["target"]
            rel = edge.get("type", "RELATED_TO")
            edge_id = edge.get("id", f"{src}_{tgt}")

            if src in adj and tgt in node_map:
                adj[src].append({
                    "neighbor_id": tgt,
                    "relationship": rel,
                    "direction": "outgoing",
                    "edge_id": edge_id,
                })
            if tgt in adj and src in node_map:
                adj[tgt].append({
                    "neighbor_id": src,
                    "relationship": rel,
                    "direction": "incoming",
                    "edge_id": edge_id,
                })

        return node_map, adj

    def bfs(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        start_node_id: str,
        goal_node_id: str,
    ) -> Dict[str, Any]:
        """
        Breadth-First Search (BFS): Level-by-level shortest-path search.
        """
        node_map, adj = self._build_adjacency(nodes, edges)

        if start_node_id not in node_map:
            raise ValueError(f"Start node '{start_node_id}' does not exist in graph.")
        if goal_node_id not in node_map:
            raise ValueError(f"Goal node '{goal_node_id}' does not exist in graph.")

        visited_order: List[str] = []
        steps: List[Dict[str, Any]] = []

        # Queue stores current_node_id
        queue: deque = deque([start_node_id])
        visited: Set[str] = {start_node_id}

        # Parent pointer tracks (parent_id, relationship, direction)
        parent: Dict[str, Optional[Tuple[str, str, str]]] = {start_node_id: None}

        found = False
        step_num = 1

        while queue:
            current_id = queue.popleft()
            visited_order.append(current_id)

            curr_node = node_map[current_id]
            parent_info = parent[current_id]

            if parent_info:
                p_id, rel, dirn = parent_info
                rel_desc = f"{rel} ({dirn})"
                explanation = f"Expanded node '{curr_node['label']}' via {rel_desc} from '{node_map[p_id]['label']}'."
            else:
                rel_desc = "START"
                explanation = f"Search started at node '{curr_node['label']}'."

            steps.append({
                "step_number": step_num,
                "node_id": current_id,
                "node_label": curr_node.get("label", ""),
                "node_type": curr_node.get("type", ""),
                "relationship_followed": rel_desc,
                "explanation": explanation,
            })
            step_num += 1

            if current_id == goal_node_id:
                found = True
                break

            for edge_info in adj.get(current_id, []):
                nbr_id = edge_info["neighbor_id"]
                if nbr_id not in visited:
                    visited.add(nbr_id)
                    parent[nbr_id] = (
                        current_id,
                        edge_info["relationship"],
                        edge_info["direction"],
                    )
                    queue.append(nbr_id)

        # Reconstruct path
        path: List[str] = []
        path_edges: List[Dict[str, Any]] = []

        if found:
            curr = goal_node_id
            while curr is not None:
                path.append(curr)
                p_info = parent[curr]
                if p_info:
                    p_id, rel, dirn = p_info
                    path_edges.append({
                        "from_node": p_id,
                        "to_node": curr,
                        "relationship": rel,
                        "direction": dirn,
                    })
                    curr = p_id
                else:
                    curr = None
            path.reverse()
            path_edges.reverse()

        path_length = len(path_edges)

        summary_explanation = (
            f"BFS discovered an optimal {path_length}-hop path from "
            f"'{node_map[start_node_id]['label']}' to '{node_map[goal_node_id]['label']}' "
            f"after exploring {len(visited_order)} nodes level-by-level."
            if found
            else f"BFS explored {len(visited_order)} nodes, but goal node "
                 f"'{node_map[goal_node_id]['label']}' is not reachable from start node."
        )

        return {
            "algorithm": "BFS",
            "start_node": start_node_id,
            "goal_node": goal_node_id,
            "found": found,
            "visited_order": visited_order,
            "path": path,
            "path_length": path_length,
            "path_edges": path_edges,
            "steps": steps,
            "explanation": summary_explanation,
        }

    def dfs(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        start_node_id: str,
        goal_node_id: str,
    ) -> Dict[str, Any]:
        """
        Depth-First Search (DFS): Stack-based deep branch exploration.
        """
        node_map, adj = self._build_adjacency(nodes, edges)

        if start_node_id not in node_map:
            raise ValueError(f"Start node '{start_node_id}' does not exist in graph.")
        if goal_node_id not in node_map:
            raise ValueError(f"Goal node '{goal_node_id}' does not exist in graph.")

        visited_order: List[str] = []
        steps: List[Dict[str, Any]] = []

        stack: List[str] = [start_node_id]
        visited: Set[str] = set()
        parent: Dict[str, Optional[Tuple[str, str, str]]] = {start_node_id: None}

        found = False
        step_num = 1

        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue

            visited.add(current_id)
            visited_order.append(current_id)

            curr_node = node_map[current_id]
            parent_info = parent[current_id]

            if parent_info:
                p_id, rel, dirn = parent_info
                rel_desc = f"{rel} ({dirn})"
                explanation = f"Deep branch reached node '{curr_node['label']}' via {rel_desc} from '{node_map[p_id]['label']}'."
            else:
                rel_desc = "START"
                explanation = f"DFS traversal initiated at node '{curr_node['label']}'."

            steps.append({
                "step_number": step_num,
                "node_id": current_id,
                "node_label": curr_node.get("label", ""),
                "node_type": curr_node.get("type", ""),
                "relationship_followed": rel_desc,
                "explanation": explanation,
            })
            step_num += 1

            if current_id == goal_node_id:
                found = True
                break

            # Reverse neighbors so they are explored in natural deterministic order
            neighbors = adj.get(current_id, [])
            for edge_info in reversed(neighbors):
                nbr_id = edge_info["neighbor_id"]
                if nbr_id not in visited:
                    parent[nbr_id] = (
                        current_id,
                        edge_info["relationship"],
                        edge_info["direction"],
                    )
                    stack.append(nbr_id)

        path: List[str] = []
        path_edges: List[Dict[str, Any]] = []

        if found:
            curr = goal_node_id
            while curr is not None:
                path.append(curr)
                p_info = parent[curr]
                if p_info:
                    p_id, rel, dirn = p_info
                    path_edges.append({
                        "from_node": p_id,
                        "to_node": curr,
                        "relationship": rel,
                        "direction": dirn,
                    })
                    curr = p_id
                else:
                    curr = None
            path.reverse()
            path_edges.reverse()

        path_length = len(path_edges)

        summary_explanation = (
            f"DFS discovered a {path_length}-hop path from "
            f"'{node_map[start_node_id]['label']}' to '{node_map[goal_node_id]['label']}' "
            f"after exploring {len(visited_order)} nodes depth-first."
            if found
            else f"DFS traversed {len(visited_order)} nodes, but goal node "
                 f"'{node_map[goal_node_id]['label']}' is not reachable from start node."
        )

        return {
            "algorithm": "DFS",
            "start_node": start_node_id,
            "goal_node": goal_node_id,
            "found": found,
            "visited_order": visited_order,
            "path": path,
            "path_length": path_length,
            "path_edges": path_edges,
            "steps": steps,
            "explanation": summary_explanation,
        }

    def best_first_search(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        start_node_id: str,
        goal_node_id: str,
    ) -> Dict[str, Any]:
        """
        Greedy Best-First Search using explicit heuristic h(n).

        Prioritizes nodes with minimal estimated distance h(n) to the goal.
        """
        node_map, adj = self._build_adjacency(nodes, edges)

        if start_node_id not in node_map:
            raise ValueError(f"Start node '{start_node_id}' does not exist in graph.")
        if goal_node_id not in node_map:
            raise ValueError(f"Goal node '{goal_node_id}' does not exist in graph.")

        goal_node = node_map[goal_node_id]
        goal_direct_nbrs = {e["neighbor_id"] for e in adj.get(goal_node_id, [])}

        visited_order: List[str] = []
        steps: List[Dict[str, Any]] = []
        heuristic_values: Dict[str, float] = {}

        # Priority queue stores: (heuristic_cost, tie_breaker_counter, node_id)
        counter = 0
        start_h = compute_heuristic(node_map[start_node_id], goal_node, goal_direct_nbrs)
        heuristic_values[start_node_id] = start_h

        pq: List[Tuple[float, int, str]] = [(start_h, counter, start_node_id)]
        visited: Set[str] = set()
        parent: Dict[str, Optional[Tuple[str, str, str]]] = {start_node_id: None}

        found = False
        step_num = 1

        while pq:
            h_val, _, current_id = heapq.heappop(pq)
            if current_id in visited:
                continue

            visited.add(current_id)
            visited_order.append(current_id)

            curr_node = node_map[current_id]
            parent_info = parent[current_id]
            rel_score = round(1.0 - h_val, 3)

            if parent_info:
                p_id, rel, dirn = parent_info
                rel_desc = f"{rel} ({dirn})"
                explanation = (
                    f"Best-First Search selected node '{curr_node['label']}' "
                    f"with heuristic distance h={h_val:.3f} (relevance={rel_score:.3f}) "
                    f"via {rel_desc} from '{node_map[p_id]['label']}'."
                )
            else:
                rel_desc = "START"
                explanation = (
                    f"Best-First Search initialized at node '{curr_node['label']}' "
                    f"with heuristic distance h={h_val:.3f} to goal."
                )

            steps.append({
                "step_number": step_num,
                "node_id": current_id,
                "node_label": curr_node.get("label", ""),
                "node_type": curr_node.get("type", ""),
                "relationship_followed": rel_desc,
                "heuristic_value": h_val,
                "relevance_score": rel_score,
                "explanation": explanation,
            })
            step_num += 1

            if current_id == goal_node_id:
                found = True
                break

            for edge_info in adj.get(current_id, []):
                nbr_id = edge_info["neighbor_id"]
                if nbr_id not in visited:
                    if nbr_id not in heuristic_values:
                        nbr_node = node_map[nbr_id]
                        nbr_h = compute_heuristic(nbr_node, goal_node, goal_direct_nbrs)
                        heuristic_values[nbr_id] = nbr_h
                    else:
                        nbr_h = heuristic_values[nbr_id]

                    if nbr_id not in parent:
                        parent[nbr_id] = (
                            current_id,
                            edge_info["relationship"],
                            edge_info["direction"],
                        )
                    counter += 1
                    heapq.heappush(pq, (nbr_h, counter, nbr_id))

        path: List[str] = []
        path_edges: List[Dict[str, Any]] = []

        if found:
            curr = goal_node_id
            while curr is not None:
                path.append(curr)
                p_info = parent[curr]
                if p_info:
                    p_id, rel, dirn = p_info
                    path_edges.append({
                        "from_node": p_id,
                        "to_node": curr,
                        "relationship": rel,
                        "direction": dirn,
                    })
                    curr = p_id
                else:
                    curr = None
            path.reverse()
            path_edges.reverse()

        path_length = len(path_edges)

        summary_explanation = (
            f"Best-First Search guided by explicit lexical and structural heuristic values "
            f"discovered a {path_length}-hop path from '{node_map[start_node_id]['label']}' "
            f"to '{node_map[goal_node_id]['label']}' after visiting {len(visited_order)} nodes."
            if found
            else f"Best-First Search evaluated {len(visited_order)} nodes, but goal node "
                 f"'{node_map[goal_node_id]['label']}' is not reachable from start node."
        )

        return {
            "algorithm": "Best-First Search",
            "start_node": start_node_id,
            "goal_node": goal_node_id,
            "found": found,
            "visited_order": visited_order,
            "path": path,
            "path_length": path_length,
            "path_edges": path_edges,
            "steps": steps,
            "heuristic_values": heuristic_values,
            "explanation": summary_explanation,
        }

    def search(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        start_node_id: str,
        goal_node_id: str,
        algorithm: str = "bfs",
    ) -> Dict[str, Any]:
        """
        Dispatch search query to specified algorithm.

        Args:
            nodes: Graph nodes
            edges: Graph edges
            start_node_id: ID of start node
            goal_node_id: ID of goal node
            algorithm: One of 'bfs', 'dfs', 'best_first'
        """
        algo = (algorithm or "bfs").lower().strip()
        if algo in ("bfs", "breadth_first", "breadth-first"):
            return self.bfs(nodes, edges, start_node_id, goal_node_id)
        elif algo in ("dfs", "depth_first", "depth-first"):
            return self.dfs(nodes, edges, start_node_id, goal_node_id)
        elif algo in ("best_first", "best-first", "bestfirst", "greedy"):
            return self.best_first_search(nodes, edges, start_node_id, goal_node_id)
        else:
            raise ValueError(
                f"Unsupported search algorithm '{algorithm}'. Must be one of: bfs, dfs, best_first."
            )


# Singleton search service instance
graph_search_service = GraphSearchService()
