# backend/src/gnn/gnn_query.py
import torch
import numpy as np
from pathlib import Path
from src.gnn.graph_builder import CodebaseGraph
from src.gnn.gnn_model import CodeGraphSAGE
import pickle

class GNNQuery:
    def __init__(self, model_path="./backend/models/gnn_model.pt", workspace_path="./workspace"):
        self.workspace_path = workspace_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.embeddings = None
        self.node_list = None
        self.load_model(model_path)

    def load_model(self, model_path):
        # Rebuild graph to get node features and indices
        builder = CodebaseGraph(self.workspace_path)
        nx_graph = builder.build()
        self.node_list = list(nx_graph.nodes)
        # Build feature matrix (same as trainer)
        features = []
        for node in self.node_list:
            feat = builder.node_features.get(node, {})
            loc = min(feat.get("loc", 0) / 1000, 1.0)
            func_count = min(feat.get("func_count", 0) / 20, 1.0)
            class_count = min(feat.get("class_count", 0) / 10, 1.0)
            lang_map = {"py": 0, "js": 1, "ts": 2, "jsx": 3, "tsx": 4}
            lang_onehot = [0]*5
            lang = feat.get("language", "py")
            if lang in lang_map:
                lang_onehot[lang_map[lang]] = 1
            features.append([loc, func_count, class_count] + lang_onehot)
        x = torch.tensor(features, dtype=torch.float).to(self.device)
        # Build edge index
        edge_index = []
        for u, v in nx_graph.edges:
            u_idx = self.node_list.index(u)
            v_idx = self.node_list.index(v)
            edge_index.append([u_idx, v_idx])
            edge_index.append([v_idx, u_idx])
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous().to(self.device)
        # Initialize model
        in_channels = x.shape[1]
        self.model = CodeGraphSAGE(in_channels, 64, 128).to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        with torch.no_grad():
            z = self.model(x, edge_index)
            self.embeddings = z.cpu().numpy()

    def get_related_files(self, target_file: str, top_k=5):
        if target_file not in self.node_list:
            return []
        idx = self.node_list.index(target_file)
        target_emb = self.embeddings[idx]
        similarities = [np.dot(target_emb, emb) / (np.linalg.norm(target_emb)*np.linalg.norm(emb)+1e-8) for emb in self.embeddings]
        nearest = sorted(enumerate(similarities), key=lambda x: x[1], reverse=True)[1:top_k+1]
        return [{"file": self.node_list[i], "similarity": float(s)} for i, s in nearest]
