import copy
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('migration', pathlib.Path(__file__).with_name('copiar-estudos.py'))
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.user = {'fields': {
            'email': {'stringValue': 'aluno@example.com'},
            'activeProfileId': {'stringValue': 'plano-1'},
            'reminders': {'arrayValue': {'values': [{'stringValue': 'Lembrete'}]}},
        }, 'updateTime': '2026-10-21T00:00:00Z'}
        self.profiles = [{'name': migration.SOURCE + '/profiles/plano-1', 'fields': {
            'id': {'stringValue': 'plano-1'}, 'name': {'stringValue': 'Concurso'},
            'activityLogs': {'arrayValue': {'values': [{'mapValue': {'fields': {'timeSpentMin': {'integerValue': '120'}}}}]}},
        }}]

    def test_preserves_studies_and_only_writes_target(self):
        original = copy.deepcopy(self.profiles)
        writes, expected = migration.make_plan(self.user, self.profiles, self.user, [])
        self.assertEqual(len(writes), 2)
        self.assertEqual(self.profiles, original)
        self.assertEqual(writes[0]['update']['fields']['activityLogs'], self.profiles[0]['fields']['activityLogs'])
        self.assertTrue(all(w['update']['name'].startswith(migration.TARGET) for w in writes))
        self.assertEqual(writes[0]['currentDocument'], {'exists': False})
        self.assertEqual(writes[1]['currentDocument'], {'updateTime': self.user['updateTime']})
        self.assertNotIn('email', writes[1]['update']['fields'])
        self.assertEqual(writes[1]['update']['fields']['activeProfileId']['stringValue'], next(iter(expected)).rsplit('/', 1)[-1])

    def test_completed_copy_is_idempotent(self):
        _, expected = migration.make_plan(self.user, self.profiles, self.user, [])
        existing = [{'name': name, 'fields': fields} for name, fields in expected.items()]
        writes, _ = migration.make_plan(self.user, self.profiles, self.user, existing)
        self.assertEqual(writes, [])

    def test_changed_destination_is_never_overwritten(self):
        _, expected = migration.make_plan(self.user, self.profiles, self.user, [])
        existing = [{'name': name, 'fields': {**fields, 'name': {'stringValue': 'Alterado'}}} for name, fields in expected.items()]
        with self.assertRaises(ValueError):
            migration.make_plan(self.user, self.profiles, self.user, existing)

    def test_wrong_account_and_empty_source_are_rejected(self):
        target = copy.deepcopy(self.user)
        target['fields']['email']['stringValue'] = 'outra@example.com'
        with self.assertRaises(ValueError):
            migration.make_plan(self.user, self.profiles, target, [])
        with self.assertRaises(ValueError):
            migration.make_plan(self.user, [], self.user, [])


if __name__ == '__main__':
    unittest.main()
