# backend/src/ast/parser.py
import tree_sitter
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
from pathlib import Path
from typing import List, Dict, Optional

class ASTParser:
    def __init__(self):
        # Setup parsers for different languages
        self.parsers = {}
        self._init_parser("python", tspython.language())
        self._init_parser("javascript", tsjavascript.language())
        self._init_parser("typescript", tstypescript.language_typescript())
        self._init_parser("tsx", tstypescript.language_tsx())
        # Also support JSX (use JavaScript parser, it handles JSX)
        self._init_parser("jsx", tsjavascript.language())

    def _init_parser(self, lang: str, language):
        parser = Parser()
        parser.set_language(language)
        self.parsers[lang] = parser

    def detect_language(self, filepath: str) -> Optional[str]:
        ext = Path(filepath).suffix.lower()
        lang_map = {
            ".py": "python",
            ".js": "javascript",
            ".mjs": "javascript",
            ".cjs": "javascript",
            ".jsx": "jsx",
            ".ts": "typescript",
            ".tsx": "tsx"
        }
        return lang_map.get(ext)

    def parse_file(self, filepath: str, code: str) -> Dict:
        lang = self.detect_language(filepath)
        if not lang or lang not in self.parsers:
            return {"error": f"Unsupported language: {lang}"}
        parser = self.parsers[lang]
        tree = parser.parse(bytes(code, "utf-8"))
        root = tree.root_node
        functions = self._extract_functions(root, code)
        classes = self._extract_classes(root, code)
        imports = self._extract_imports(root, code, lang)
        exports = self._extract_exports(root, code, lang)
        return {
            "functions": functions,
            "classes": classes,
            "imports": imports,
            "exports": exports
        }

    def _extract_functions(self, node, code: str) -> List[Dict]:
        functions = []
        if node.type == "function_definition" or node.type == "function_declaration":
            name_node = self._get_child_by_field(node, "name")
            if name_node:
                name = code[name_node.start_byte:name_node.end_byte]
                params_node = self._get_child_by_field(node, "parameters")
                params = code[params_node.start_byte:params_node.end_byte] if params_node else "()"
                return_type = self._get_return_type(node, code)
                docstring = self._get_docstring(node, code)
                functions.append({
                    "name": name,
                    "signature": f"{name}{params} -> {return_type}" if return_type else f"{name}{params}",
                    "return_type": return_type,
                    "docstring": docstring,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1
                })
        for child in node.children:
            functions.extend(self._extract_functions(child, code))
        return functions

    def _extract_classes(self, node, code: str) -> List[Dict]:
        classes = []
        if node.type == "class_definition":
            name_node = self._get_child_by_field(node, "name")
            name = code[name_node.start_byte:name_node.end_byte] if name_node else "Unknown"
            methods = self._extract_functions(node, code)  # methods inside class
            base_classes = []
            classes.append({
                "name": name,
                "methods": methods,
                "base_classes": base_classes
            })
        for child in node.children:
            classes.extend(self._extract_classes(child, code))
        return classes

    def _extract_imports(self, node, code: str, lang: str) -> List[Dict]:
        imports = []
        if lang == "python":
            if node.type == "import_statement":
                # e.g., import os
                names = []
                for child in node.children:
                    if child.type == "dotted_name":
                        names.append(code[child.start_byte:child.end_byte])
                if names:
                    imports.append({"module": names[0], "names": names[1:], "alias": None})
            elif node.type == "import_from_statement":
                module_node = self._get_child_by_field(node, "module_name")
                module = code[module_node.start_byte:module_node.end_byte] if module_node else ""
                name_nodes = self._get_children_by_field(node, "name")
                names = [code[n.start_byte:n.end_byte] for n in name_nodes]
                imports.append({"module": module, "names": names, "alias": None})
        else:  # JavaScript/TypeScript
            if node.type == "import_statement":
                source_node = self._get_child_by_field(node, "source")
                source = code[source_node.start_byte:source_node.end_byte] if source_node else ""
                imports.append({"module": source.strip('"\'')})
        for child in node.children:
            imports.extend(self._extract_imports(child, code, lang))
        return imports

    def _extract_exports(self, node, code: str, lang: str) -> List[str]:
        exports = []
        if lang == "python":
            if node.type == "expression_statement" and node.children:
                first = node.children[0]
                if first.type == "assignment" and first.children and first.children[0].type == "identifier":
                    name = code[first.children[0].start_byte:first.children[0].end_byte]
                    exports.append(name)
        else:  # JavaScript/TypeScript
            if node.type == "export_statement":
                # Simplified: look for "export default ..." etc.
                for child in node.children:
                    if child.type == "identifier":
                        exports.append(code[child.start_byte:child.end_byte])
        for child in node.children:
            exports.extend(self._extract_exports(child, code, lang))
        return exports

    def _get_child_by_field(self, node, field: str):
        for child in node.children:
            if child.field_name == field:
                return child
        return None

    def _get_children_by_field(self, node, field: str):
        return [child for child in node.children if child.field_name == field]

    def _get_return_type(self, node, code: str) -> Optional[str]:
        # Simple heuristic: look for "->" in Python
        for child in node.children:
            if child.type == "type":
                return code[child.start_byte:child.end_byte]
        return None

    def _get_docstring(self, node, code: str) -> Optional[str]:
        # Look for string literal as first child
        for child in node.children:
            if child.type == "string" or child.type == "expression_statement":
                return code[child.start_byte:child.end_byte]
        return None

# Singleton instance
_ast_parser = None
def get_ast_parser():
    global _ast_parser
    if _ast_parser is None:
        _ast_parser = ASTParser()
    return _ast_parser
