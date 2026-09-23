"""
GapGuard AI — Tests for Graph Search Algorithms (BFS, DFS, Best-First Search) and API

Verifies:
G. BFS visits nodes in expected breadth-first order.
H. BFS finds an existing path.
I. BFS handles unreachable goal.
J. DFS finds an existing path.
K. DFS handles unreachable goal.
L. Best-First Search uses explicit heuristic.
M. Best-First Search returns traversal/path information.
N. Knowledge graph endpoint works.
O. Search endpoint works.
P. Invalid project/node input is handled safely.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.research_graph import research_graph_service
from services.graph_search import (
    GraphSearchService,
    graph_search_service,
    compute_heuristic,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_graph():
    """A deterministic linear/branching test graph for algorithmic verification."""
    nodes = [
        {"id": "A", "label": "Research Project A", "type": "Research Project", "source": "project"},
        {"id": "B", "label": "Claimed Gap B", "type": "Claimed Research Gap", "source": "project"},
        {"id": "C", "label": "Proposed Method C", "type": "Proposed Method", "source": "project"},
        {"id": "D", "label": "Literature Paper D", "type": "Literature Paper", "source": "literature"},
        {"id": "E", "label": "Limitation E", "type": "Limitation", "source": "literature"},
        {"id": "Z", "label": "Isolated Node Z", "type": "Limitation", "source": "literature"},
    ]
    # Edges:
    # A -> B (HAS_GAP)
    # A -> C (USES_METHOD)
    # B -> D (SUPPORTED_BY)
    # D -> E (HAS_LIMITATION)
    # Z has no edges (unreachable)
    edges = [
        {"id": "e1", "source": "A", "target": "B", "type": "HAS_GAP"},
        {"id": "e2", "source": "A", "target": "C", "type": "USES_METHOD"},
        {"id": "e3", "source": "B", "target": "D", "type": "SUPPORTED_BY"},
        {"id": "e4", "source": "D", "target": "E", "type": "HAS_LIMITATION"},
    ]
    return nodes, edges


class TestGraphSearchAlgorithms:
    """Test suite for BFS, DFS, and Best-First Search implementations."""

    def test_g_bfs_visits_nodes_in_expected_breadth_first_order(self, test_graph):
        """Test G: BFS explores direct neighbors before deeper levels."""
        nodes, edges = test_graph
        result = graph_search_service.bfs(nodes, edges, start_node_id="A", goal_node_id="E")

        # In BFS starting at A:
        # Step 1: A is visited
        # Level 1: B and C are queued and visited before D or E
        visited = result["visited_order"]
        assert visited[0] == "A"
        assert "B" in visited
        assert "C" in visited
        # B and C must appear before D and E
        b_idx = visited.index("B")
        c_idx = visited.index("C")
        d_idx = visited.index("D")
        e_idx = visited.index("E")

        assert max(b_idx, c_idx) < d_idx < e_idx
        assert result["found"] is True

    def test_h_bfs_finds_an_existing_path(self, test_graph):
        """Test H: BFS correctly reconstructs shortest-hop path."""
        nodes, edges = test_graph
        result = graph_search_service.bfs(nodes, edges, start_node_id="A", goal_node_id="E")

        assert result["found"] is True
        assert result["path"] == ["A", "B", "D", "E"]
        assert result["path_length"] == 3
        assert len(result["path_edges"]) == 3
        assert result["path_edges"][0]["relationship"] == "HAS_GAP"
        assert result["path_edges"][1]["relationship"] == "SUPPORTED_BY"
        assert result["path_edges"][2]["relationship"] == "HAS_LIMITATION"

    def test_i_bfs_handles_unreachable_goal(self, test_graph):
        """Test I: BFS cleanly handles disconnected/unreachable nodes."""
        nodes, edges = test_graph
        result = graph_search_service.bfs(nodes, edges, start_node_id="A", goal_node_id="Z")

        assert result["found"] is False
        assert result["path"] == []
        assert result["path_length"] == 0
        assert "not reachable" in result["explanation"]

    def test_j_dfs_finds_an_existing_path(self, test_graph):
        """Test J: DFS discovers a valid path from start to goal."""
        nodes, edges = test_graph
        result = graph_search_service.dfs(nodes, edges, start_node_id="A", goal_node_id="E")

        assert result["found"] is True
        assert result["path"][0] == "A"
        assert result["path"][-1] == "E"
        assert result["path_length"] >= 1
        assert len(result["steps"]) > 0

    def test_k_dfs_handles_unreachable_goal(self, test_graph):
        """Test K: DFS cleanly handles disconnected/unreachable nodes."""
        nodes, edges = test_graph
        result = graph_search_service.dfs(nodes, edges, start_node_id="A", goal_node_id="Z")

        assert result["found"] is False
        assert result["path"] == []
        assert result["path_length"] == 0

    def test_l_best_first_search_uses_explicit_heuristic(self, test_graph):
        """Test L: Best-First Search calculates and exposes explicit heuristic values."""
        nodes, edges = test_graph
        # Goal node has h(E, E) == 0.0
        node_map = {n["id"]: n for n in nodes}
        h_goal = compute_heuristic(node_map["E"], node_map["E"])
        assert h_goal == 0.0

        # Direct neighbor D to E has low heuristic value
        h_direct = compute_heuristic(node_map["D"], node_map["E"], direct_neighbors={"E"})
        assert h_direct == 0.10

        result = graph_search_service.best_first_search(nodes, edges, start_node_id="A", goal_node_id="E")
        assert result["found"] is True
        assert "heuristic_values" in result
        assert "A" in result["heuristic_values"]
        assert all(isinstance(v, (int, float)) for v in result["heuristic_values"].values())

    def test_m_best_first_search_returns_traversal_and_path_information(self, test_graph):
        """Test M: Best-First Search returns detailed traversal sequence, path, and step explainability."""
        nodes, edges = test_graph
        result = graph_search_service.best_first_search(nodes, edges, start_node_id="A", goal_node_id="E")

        assert result["found"] is True
        assert result["path"] == ["A", "B", "D", "E"]
        assert result["path_length"] == 3
        assert len(result["steps"]) == len(result["visited_order"])

        # Every step in Best-First Search should include heuristic and relevance score
        for step in result["steps"]:
            assert "heuristic_value" in step
            assert "relevance_score" in step
            assert "explanation" in step
            assert "relationship_followed" in step


class TestKnowledgeGraphAPI:
    """Test suite for Knowledge Graph and Search REST endpoints."""

    def test_n_knowledge_graph_endpoint_works(self, client):
        """Test N: GET /api/knowledge-graph/{project_id} returns valid graph structure."""
        response = client.get("/api/knowledge-graph/proj-01")
        assert response.status_code == 200
        data = response.json()

        assert "nodes" in data
        assert "edges" in data
        assert "statistics" in data
        assert "corpus_limitation_statement" in data
        assert len(data["nodes"]) >= 5
        assert len(data["edges"]) >= 4

    def test_o_search_endpoint_works(self, client):
        """Test O: POST /api/knowledge-graph/search executes BFS, DFS, and Best-First."""
        # 1. Fetch graph first
        graph_res = client.get("/api/knowledge-graph/proj-01")
        assert graph_res.status_code == 200
        graph_data = graph_res.json()

        nodes = graph_data["nodes"]
        start_id = nodes[0]["id"]
        # Pick another node in the graph
        goal_id = nodes[1]["id"]

        for algo in ["bfs", "dfs", "best_first"]:
            payload = {
                "start_node": start_id,
                "goal_node": goal_id,
                "algorithm": algo,
                "nodes": graph_data["nodes"],
                "edges": graph_data["edges"],
            }
            res = client.post("/api/knowledge-graph/search", json=payload)
            assert res.status_code == 200, f"Search failed for {algo}: {res.text}"
            data = res.json()
            assert data["start_node"] == start_id
            assert data["goal_node"] == goal_id
            assert "visited_order" in data
            assert "path" in data
            assert "steps" in data

    def test_p_invalid_project_and_node_inputs_handled_safely(self, client):
        """Test P: Invalid inputs return appropriate HTTP errors."""
        # Missing start / goal node
        invalid_payload = {
            "start_node": "",
            "goal_node": "something",
            "algorithm": "bfs",
        }
        res = client.post("/api/knowledge-graph/search", json=invalid_payload)
        assert res.status_code == 400

        # Non-existent node IDs
        non_existent_payload = {
            "start_node": "NON_EXISTENT_START_NODE",
            "goal_node": "NON_EXISTENT_GOAL_NODE",
            "algorithm": "bfs",
        }
        res2 = client.post("/api/knowledge-graph/search", json=non_existent_payload)
        assert res2.status_code == 404

        # Unsupported algorithm
        bad_algo_payload = {
            "start_node": "proj_p1",
            "goal_node": "lit_p1",
            "algorithm": "a_star_genetic",
        }
        res3 = client.post("/api/knowledge-graph/search", json=bad_algo_payload)
        assert res3.status_code == 400
