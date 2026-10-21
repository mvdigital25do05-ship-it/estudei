#!/usr/bin/env python3
"""Cópia pessoal Estudei 1 -> homologação. Sem dependências externas."""
import argparse
import hashlib
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

SOURCE_PROJECT = 'estudei-10e41'
SOURCE_DATABASE = 'ai-studio-7d8a575c-71e3-4ced-b717-0af5fd6b9a13'
SOURCE_UID = 'kQOrB6hoOfSru1w0GoZfnPqIvSg2'
TARGET_PROJECT = 'estudei-2'
TARGET_UID = 'KTuSpkb179e7uOhgoicGZVruiWg2'
BASE = 'https://firestore.googleapis.com/v1/'


def root(project, database):
    return f'projects/{project}/databases/{database}/documents'


SOURCE = root(SOURCE_PROJECT, SOURCE_DATABASE) + '/users/' + SOURCE_UID
TARGET_ROOT = root(TARGET_PROJECT, '(default)')
TARGET = TARGET_ROOT + '/users/' + TARGET_UID


def profile_id(source_id):
    return 'migrado_' + hashlib.sha256((SOURCE_UID + '/' + source_id).encode()).hexdigest()[:32]


def make_plan(source_user, source_profiles, target_user, target_profiles):
    old_email = source_user.get('fields', {}).get('email', {}).get('stringValue', '').strip().lower()
    new_email = target_user.get('fields', {}).get('email', {}).get('stringValue', '').strip().lower()
    if not old_email or old_email != new_email:
        raise ValueError('Os e-mails dos documentos das duas contas não correspondem. Nenhuma gravação realizada.')
    if not source_profiles:
        raise ValueError('Nenhum perfil encontrado no banco antigo. Nenhuma gravação realizada.')
    if len(source_profiles) > 400:
        raise ValueError('Mais de 400 perfis; exige outro procedimento para preservar a atomicidade.')
    writes = []
    ids = {}
    expected = {}
    existing = {p['name']: p for p in target_profiles}
    for profile in source_profiles:
        source_id = profile['name'].rsplit('/', 1)[-1]
        new_id = profile_id(source_id)
        ids[source_id] = new_id
        name = TARGET + '/profiles/' + new_id
        fields = {**profile.get('fields', {}), 'id': {'stringValue': new_id}}
        expected[name] = fields
        if name in existing:
            if existing[name].get('fields', {}) != fields:
                raise ValueError('Um perfil já migrado foi alterado. Interrompido para não sobrescrever estudos.')
        else:
            writes.append({'update': {'name': name, 'fields': fields}, 'currentDocument': {'exists': False}})
    active = source_user.get('fields', {}).get('activeProfileId', {}).get('stringValue', '')
    metadata = {'activeProfileId': {'stringValue': ids.get(active, next(iter(ids.values())))}}
    if 'reminders' in source_user.get('fields', {}):
        metadata['reminders'] = source_user['fields']['reminders']
    # Aplicar novamente um lote concluído não altera perfis nem metadados.
    if writes:
        writes.append({
            'update': {'name': TARGET, 'fields': metadata},
            'updateMask': {'fieldPaths': list(metadata)},
            'currentDocument': {'updateTime': target_user['updateTime']},
        })
    return writes, expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aplicar', action='store_true', help='Grava após validar. Sem esta opção, apenas consulta.')
    args = parser.parse_args()
    token = subprocess.run(['gcloud', 'auth', 'print-access-token'], check=True, capture_output=True, text=True).stdout.strip()
    if not token:
        raise ValueError('A sessão do Google Cloud Shell não está autenticada.')

    def request(path, body=None):
        # Única escrita permitida: commit do banco (default) do projeto estudei-2.
        if body is not None:
            allowed = f'projects/{TARGET_PROJECT}/databases/(default)/documents:commit'
            if path != allowed:
                raise ValueError('Destino de escrita recusado.')
            for write in body['writes']:
                name = write['update']['name']
                if name != TARGET and not name.startswith(TARGET + '/profiles/'):
                    raise ValueError('Escrita fora da conta de destino recusada.')
        req = urllib.request.Request(BASE + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            try:
                detail = json.load(error).get('error', {}).get('message', '')
            except (ValueError, AttributeError):
                detail = 'Resposta sem detalhes.'
            raise ValueError(f'Firebase HTTP {error.code}: {detail}') from None

    def profiles(user_path):
        result = []
        page_token = None
        while True:
            query = {'pageSize': 100}
            if page_token:
                query['pageToken'] = page_token
            page = request(user_path + '/profiles?' + urllib.parse.urlencode(query))
            result.extend(page.get('documents', []))
            page_token = page.get('nextPageToken')
            if not page_token:
                return result

    source_user = request(SOURCE)
    source_profiles = profiles(SOURCE)
    target_user = request(TARGET)
    target_profiles = profiles(TARGET)
    writes, expected = make_plan(source_user, source_profiles, target_user, target_profiles)
    print(f'Origem: {SOURCE_PROJECT} / {SOURCE_DATABASE} / {SOURCE_UID}')
    print(f'Destino: {TARGET_PROJECT} / (default) / {TARGET_UID}')
    print(f'Perfis na origem: {len(source_profiles)}. Perfis já existentes no destino: {len(target_profiles)}.')
    print(f'Perfis a criar: {max(0, len(writes) - 1)}. Perfis existentes serão preservados.')
    print('O perfil ativo e os lembretes do destino serão definidos conforme a origem; e-mail e senha serão preservados.')
    if not args.aplicar:
        print('SIMULAÇÃO concluída. Nenhuma gravação realizada. Use --aplicar para copiar.')
        return
    if writes:
        request(f'projects/{TARGET_PROJECT}/databases/(default)/documents:commit', {'writes': writes})
    actual = {p['name']: p.get('fields', {}) for p in profiles(TARGET)}
    if any(actual.get(name) != fields for name, fields in expected.items()):
        raise ValueError('A conferência final divergiu. A cópia pode ter sido gravada; não repita antes de investigar.')
    print(f'CÓPIA CONCLUÍDA: {len(expected)} perfis conferidos no destino. Nenhuma escrita foi enviada à origem.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'ERRO: {error}', file=sys.stderr)
        sys.exit(1)
