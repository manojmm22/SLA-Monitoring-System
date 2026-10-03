from app import create_app
from app.utils.database import db
from app.models.service import Service

app = create_app('development')
with app.app_context():
    svc = Service.query.filter_by(name='Payments API').first()
    if svc:
        svc.name = 'SLA Gateway'
        db.session.commit()
        print('RENAMED', svc.name)
    else:
        print('NOT_FOUND')
