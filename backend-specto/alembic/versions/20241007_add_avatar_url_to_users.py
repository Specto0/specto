
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = "add_avatar_url_to_users"
down_revision: Union[str, None] = "ee4f6f0f094d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "avatar_url" not in columns:
        op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "avatar_url" in columns:
        op.drop_column("users", "avatar_url")
