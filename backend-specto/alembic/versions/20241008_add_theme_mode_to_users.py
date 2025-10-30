"""add theme mode to users

Revision ID: add_theme_mode_to_users
Revises: add_avatar_url_to_users
Create Date: 2024-10-08 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_theme_mode_to_users"
down_revision: Union[str, None] = "add_avatar_url_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}

    if "theme_mode" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "theme_mode",
                sa.Boolean(),
                nullable=False,
                server_default=sa.sql.expression.true(),
            ),
        )
        op.execute(sa.text("UPDATE users SET theme_mode = TRUE WHERE theme_mode IS NULL"))
    else:
        column_info = inspector.get_columns("users", include_default=True)
        info = next((col for col in column_info if col["name"] == "theme_mode"), None)
        if info and not isinstance(info["type"], sa.Boolean):
            op.alter_column(
                "users",
                "theme_mode",
                type_=sa.Boolean(),
                postgresql_using="CASE WHEN lower(theme_mode::text) = 'light' THEN FALSE ELSE TRUE END",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "theme_mode" in columns:
        op.drop_column("users", "theme_mode")
