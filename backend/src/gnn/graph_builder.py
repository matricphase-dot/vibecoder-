# backend/src/gnn/graph_builder.py
import networkx as nx
from pathlib import Path
import ast
import re
from typing import Dict, Set, Tuple

class CodebaseGraph:
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.graph = nx.DiGraph()
        self.node_features = {}  # file -> feature dict

    def build(self):
        """Build graph from all Python/JS files in workspace."""
        self.graph.clear()
        self.node_features.clear()
        for filepath in self.workspace_path.rglob("*"):
            if filepath.suffix in [".py", ".js", ".ts", ".jsx", ".tsx"]:
                self._add_file(str(filepath.relative_to(self.workspace_path)), filepath)
        return self.graph

    def _add_file(self, rel_path: str, full_path: Path):
        self.graph.add_node(rel_path)
        # Compute basic features
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                code = f.read()
            # Simple features
            loc = len(code.splitlines())
            func_count = code.count("def ") + code.count("function ")
            class_count = code.count("class ")
            self.node_features[rel_path] = {
                "loc": loc,
                "func_count": func_count,
                "class_count": class_count,
                "language": full_path.suffix[1:]
            }
            # Extract imports (Python)
            if full_path.suffix == ".py":
                self._extract_python_imports(rel_path, code)
            # For JS/TS, we could use regex or tree-sitter, but keep simple for now
        except Exception as e:
            print(f"Error parsing {full_path}: {e}")

    def _extract_python_imports(self, node_path: str, code: str):
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imported = alias.name.split('.')[0]
                        # Find matching file (simplistic)
                        for other in self.graph.nodes:
                            if other.endswith(f"{imported}.py"):
                                self.graph.add_edge(node_path, other)
                elif isinstance(node, ast.ImportFrom):
                    module = node.module.split('.')[0] if node.module else ""
                    if module:
                        for other in self.graph.nodes:
                            if other.endswith(f"{module}.py"):
                                self.graph.add_edge(node_path, other)
        except:
            pass

    def get_node_features(self) -> Dict:
        return self.node_features
