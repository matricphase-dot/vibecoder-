from src.core.graph_query import GraphQuery
_current_graph = None
def set_current_graph(graph):
    global _current_graph
    _current_graph = graph
def get_current_graph():
    return _current_graph
