# backend/src/api/graph_routes.py
from fastapi import APIRouter, BackgroundTasks
from src.gnn.gnn_trainer import GNNTrainer
from src.gnn.gnn_query import GNNQuery
import os

router = APIRouter(prefix="/api/graph", tags=["graph"])

_gnn_query = None

def get_query():
    global _gnn_query
    if _gnn_query is None:
        _gnn_query = GNNQuery()
    return _gnn_query

@router.post("/build")
async def build_graph(background_tasks: BackgroundTasks):
    def train():
        trainer = GNNTrainer()
        embeddings = trainer.train(epochs=50)
        # Save embeddings to file for later use
        import pickle
        with open("./backend/models/gnn_embeddings.pkl", "wb") as f:
            pickle.dump(embeddings, f)
        print("GNN training complete")
    background_tasks.add_task(train)
    return {"status": "training_started", "message": "Model training in background. Check logs."}

@router.get("/related")
async def get_related(file: str, top_k: int = 5):
    query = get_query()
    results = query.get_related_files(file, top_k)
    return {"file": file, "related": results}

@router.get("/status")
async def graph_status():
    model_exists = os.path.exists("./backend/models/gnn_model.pt")
    return {"trained": model_exists}
