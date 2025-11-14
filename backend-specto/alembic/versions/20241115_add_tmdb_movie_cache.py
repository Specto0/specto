from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "add_tmdb_movie_cache"
down_revision: Union[str, None] = "add_theme_mode_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tmdb_cached_filmes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tmdb_id", sa.Integer(), nullable=False),
        sa.Column("genero_id", sa.Integer(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "cached_em",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("timezone('utc', now())"),
        ),
        sa.UniqueConstraint("tmdb_id", "genero_id", name="tmdb_cache_tmdb_genero_unq"),
    )
    op.create_index(
        "tmdb_cache_genero_idx",
        "tmdb_cached_filmes",
        ["genero_id"],
    )


def downgrade() -> None:
    op.drop_index("tmdb_cache_genero_idx", table_name="tmdb_cached_filmes")
    op.drop_table("tmdb_cached_filmes")
