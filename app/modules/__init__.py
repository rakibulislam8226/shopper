"""Feature modules.

Empty in Phase 0. Each feature added from Phase 1 onward lives in its own
subpackage following the folder-per-feature convention::

    app/modules/<feature>/
        router.py    # APIRouter — HTTP surface
        schemas.py   # pydantic request/response models
        service.py   # business logic
        models.py    # SQLAlchemy ORM models

Routers are included in the app via ``app.main`` (or an aggregating router)
as each module lands.
"""
