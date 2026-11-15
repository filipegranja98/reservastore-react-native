"""Run the real TS API client against Django on loopback, with in-memory SQLite only.
Usage: python tests/backend_smoke.py BACKEND_ROOT NODE_EXECUTABLE
Dependencies: the backend requirements; never loads dotenv or production settings.
"""
import os
import secrets
from pathlib import Path
import subprocess
import sys
import threading
from wsgiref.simple_server import make_server, WSGIRequestHandler

backend = Path(sys.argv[1]).resolve()
node = Path(sys.argv[2]).resolve()
sys.path.insert(0, str(backend))
os.environ['DJANGO_SETTINGS_MODULE'] = 'reservastoresupa.core.test_settings'
os.environ['DJANGO_LOAD_DOTENV'] = 'false'
from django.conf import settings
settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': 'file:expo_contract?mode=memory&cache=shared', 'OPTIONS': {'uri': True}}}
settings.ALLOWED_HOSTS = ['127.0.0.1']
settings.STORAGES = {**settings.STORAGES, 'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}}
import django
django.setup()
from django.core.management import call_command
from django.core.wsgi import get_wsgi_application
from django.contrib.auth import get_user_model
from reservastoresupa.lojas.models import Loja, Categoria, Produto, TipoLoja
from reservastoresupa.marketplace.models import Perfil, AreaEntrega
call_command('migrate', interactive=False, verbosity=0)
kind=TipoLoja.objects.create(nome="Synthetic store type")
merchant_password=secrets.token_urlsafe(32)
os.environ["SYNTHETIC_MERCHANT_PASSWORD"]=merchant_password
for index in range(3):
    owner = get_user_model().objects.create_user(username=f'synthetic-owner-{index}',password=merchant_password)
    Perfil.objects.create(user=owner, papel='lojista')
    shop = Loja.objects.create(dono=owner, nome=f'Synthetic shop {index}',tipo_loja=kind if index==0 else None, whatsapp='00000000', aberta=True, cor_primaria='#243B7A' if index==0 else '#880022', cor_secundaria='#FFD166' if index==0 else '#FFEEDD', ativa=index < 2, assinatura_status='ativa')
    # Keep this HTTP fixture scoped to its explicit synthetic delivery area.
    shop.areas_entrega.all().delete()
    category = Categoria.objects.create(loja=shop, nome='Synthetic category')
    Produto.objects.create(loja=shop, categoria=category, nome='Synthetic product', preco='12.50')
    AreaEntrega.objects.create(loja=shop, condominio='Synthetic condo', taxa='2.00', prazo_estimado_minutos=None)
class QuietHandler(WSGIRequestHandler):
    def log_message(self, *args):
        pass
server = make_server('127.0.0.1', 0, get_wsgi_application(), handler_class=QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    result = subprocess.run([str(node), '--import', 'tsx', 'tests/integration.ts', f'http://127.0.0.1:{server.server_port}/api/'], cwd=Path(__file__).resolve().parents[1], check=False)
finally:
    server.shutdown()
    server.server_close()
sys.exit(result.returncode)
