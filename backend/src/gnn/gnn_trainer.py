# backend/src/gnn/gnn_trainer.py
import torch
import torch.nn.functional as F
from torch_geometric.utils import negative_sampling
from sklearn.preprocessing import StandardScaler
import numpy as np
from pathlib import Path
import networkx as nx
from src.gnn.graph_builder import CodebaseGraph
from src.gnn.gnn_model import CodeGraphSAGE

class GNNTrainer:
    def __init__(self, workspace_path="./workspace", model_save_path="./backend/models/gnn_model.pt"):
        self.workspace_path = workspace_path
        self.model_save_path = Path(model_save_path)
        self.model_save_path.parent.mkdir(parents=True, exist_ok=True)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None

    def build_pyg_graph(self):
        builder = CodebaseGraph(self.workspace_path)
        nx_graph = builder.build()
        # Convert to PyG Data
        node_list = list(nx_graph.nodes)
        node_to_idx = {node: i for i, node in enumerate(node_list)}
        # Edge index
        edge_index = []
        for u, v in nx_graph.edges:
            edge_index.append([node_to_idx[u], node_to_idx[v]])
            edge_index.append([node_to_idx[v], node_to_idx[u]])  # undirected
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
        # Node features (simple: one-hot encode language + normalized LOC)
        features = []
        for node in node_list:
            feat = builder.node_features.get(node, {})
            loc = min(feat.get("loc", 0) / 1000, 1.0)  # normalize
            func_count = min(feat.get("func_count", 0) / 20, 1.0)
            class_count = min(feat.get("class_count", 0) / 10, 1.0)
            lang_map = {"py": 0, "js": 1, "ts": 2, "jsx": 3, "tsx": 4}
            lang_onehot = [0]*5
            lang = feat.get("language", "py")
            if lang in lang_map:
                lang_onehot[lang_map[lang]] = 1
            features.append([loc, func_count, class_count] + lang_onehot)
        x = torch.tensor(features, dtype=torch.float)
        return x, edge_index, node_list

    def train(self, epochs=50):
        x, edge_index, node_list = self.build_pyg_graph()
        x = x.to(self.device)
        edge_index = edge_index.to(self.device)
        in_channels = x.shape[1]
        self.model = CodeGraphSAGE(in_channels, 64, 128).to(self.device)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        self.model.train()
        for epoch in range(epochs):
            optimizer.zero_grad()
            z = self.model(x, edge_index)
            # Link prediction loss: positive edges vs negative sampled
            pos_loss = -torch.log(torch.sigmoid((z[edge_index[0]] * z[edge_index[1]]).sum(dim=1)) + 1e-15).mean()
            neg_edge_index = negative_sampling(edge_index, num_nodes=x.shape[0], num_neg_samples=edge_index.shape[1])
            neg_loss = -torch.log(1 - torch.sigmoid((z[neg_edge_index[0]] * z[neg_edge_index[1]]).sum(dim=1)) + 1e-15).mean()
            loss = pos_loss + neg_loss
            loss.backward()
            optimizer.step()
            if epoch % 10 == 0:
                print(f"Epoch {epoch}, Loss: {loss.item():.4f}")
        # Save model
        torch.save(self.model.state_dict(), self.model_save_path)
        # Save node embeddings
        embeddings = z.detach().cpu().numpy()
        return {node_list[i]: embeddings[i] for i in range(len(node_list))}
