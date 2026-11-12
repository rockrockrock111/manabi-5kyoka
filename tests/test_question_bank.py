"""Schema, legacy compatibility, coverage and independent arithmetic checks."""
import ast
import collections
from fractions import Fraction
import hashlib
import json
import operator
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'data/catalog.json').read_text())
QUESTIONS = []
for unit in CATALOG['units']:
    if unit['file']:
        QUESTIONS += json.loads((ROOT / 'data' / unit['file']).read_text())


def calculate(expression):
    operations = {ast.Add: operator.add, ast.Sub: operator.sub,
                  ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Pow: operator.pow}
    def walk(node):
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return Fraction(node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -walk(node.operand)
        if isinstance(node, ast.BinOp) and type(node.op) in operations:
            return operations[type(node.op)](walk(node.left), walk(node.right))
        raise ValueError('Unsupported arithmetic expression')
    return walk(ast.parse(expression, mode='eval').body)


class QuestionBankTests(unittest.TestCase):
    def test_schema_files_and_unique_ids(self):
        keys = {u['key'] for u in CATALOG['units']}
        self.assertEqual(len(keys), len(CATALOG['units']))
        self.assertEqual(len({u['id'] for u in CATALOG['units']}), len(keys))
        self.assertEqual(len({q['id'] for q in QUESTIONS}), len(QUESTIONS))
        declared = set()
        for u in CATALOG['units']:
            self.assertEqual(u['key'], f"{u['subject']}|{u['grade']}|{u['unit']}")
            self.assertTrue(set(u['prereq']) <= keys)
            if not u['file']:
                continue
            path = ROOT / 'data' / u['file']
            self.assertTrue(path.resolve().is_relative_to(ROOT / 'data/questions'))
            declared.add(path.resolve())
            for q in json.loads(path.read_text()):
                self.assertEqual(f"{q['subject']}|{q['grade']}|{q['unit']}", u['key'])
                self.assertIn(q['difficulty'], ('basic', 'standard', 'advanced'))
                self.assertEqual(len(q['options']), 4)
                self.assertEqual(len(set(q['options'])), 4)
                self.assertIs(type(q['answer']), int)
                self.assertIn(q['answer'], range(4))
                for field in ('id', 'question', 'explanation'):
                    self.assertTrue(isinstance(q[field], str) and q[field].strip())
                self.assertTrue(set(q['prereq']) <= keys)
                for parent in q['prereq']:
                    self.assertTrue(any(f"{x['subject']}|{x['grade']}|{x['unit']}" == parent for x in QUESTIONS))
        self.assertEqual(declared, {p.resolve() for p in (ROOT/'data/questions').rglob('*.json')})

    def test_all_legacy_records_unchanged(self):
        hashes = json.loads((ROOT / 'tests/legacy-hashes.json').read_text())
        legacy = json.loads((ROOT / 'questions.json').read_text())
        by_id = {q['id']: q for q in QUESTIONS}
        self.assertEqual(len(hashes), 126)
        self.assertEqual(set(hashes), {q['id'] for q in legacy})
        for q in legacy:
            current = dict(by_id[q['id']])
            current.pop('difficulty')
            self.assertEqual(current, q)
            self.assertEqual(hashlib.sha256(json.dumps(current, ensure_ascii=False, sort_keys=True).encode()).hexdigest(), hashes[q['id']])

    def test_each_grade1_target_has_twenty_new_basic_questions(self):
        targets = [u for u in CATALOG['units'] if u['grade']==1 and u['subject'] in ('数学','英語')]
        self.assertGreaterEqual(len(targets), 17)
        for u in targets:
            new = [q for q in QUESTIONS if q['id'].startswith(('math-g1-', 'english-g1-')) and f"{q['subject']}|{q['grade']}|{q['unit']}"==u['key']]
            self.assertGreaterEqual(len(new), 20, u['key'])
            self.assertTrue(all(q['difficulty']=='basic' for q in new))
            self.assertEqual(len({q['question'] for q in new}), len(new), u['key'])

    def test_arithmetic_answers(self):
        checked = 0
        for q in QUESTIONS:
            if q.get('verification', {}).get('kind')=='arithmetic':
                self.assertEqual(Fraction(q['options'][q['answer']]), calculate(q['verification']['expression']), q['id'])
                checked += 1
        self.assertGreaterEqual(checked, 140)

    def test_prerequisite_graph_has_no_cycles(self):
        graph={u['key']: set(u['prereq']) for u in CATALOG['units']}
        for q in QUESTIONS:
            graph[f"{q['subject']}|{q['grade']}|{q['unit']}"].update(q['prereq'])
        done=set()
        def visit(key, trail):
            self.assertNotIn(key, trail, f'Cycle at {key}')
            if key in done: return
            for parent in graph[key]: visit(parent, trail | {key})
            done.add(key)
        for key in graph: visit(key, set())

    def test_all_grades_and_subjects_remain_available(self):
        for grade in (1,2,3):
            for subject in ('英語','数学','国語','理科','社会'):
                self.assertTrue(any(q['grade']==grade and q['subject']==subject for q in QUESTIONS))
        self.assertTrue(any(not u['file'] for u in CATALOG['units']))

if __name__ == '__main__':
    unittest.main()
