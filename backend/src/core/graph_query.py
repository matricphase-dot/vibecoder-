import networkx as nx
class GraphQuery:
    def __init__(self, graph):
        self.graph = graph
    def get_connected_components(self):
        return list(nx.weakly_connected_components(self.graph))
    def get_dependencies(self, file_path):
        return list(self.graph.successors(file_path))
    def get_dependents(self, file_path):
        return list(self.graph.predecessors(file_path))
