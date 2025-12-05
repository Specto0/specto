from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_forum_chat"
down_revision: Union[str, None] = "add_tmdb_movie_cache"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forum_topics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("forum_topics_type_idx", "forum_topics", ["type"])

    op.create_table(
        "forum_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("forum_topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("forum_posts_topic_idx", "forum_posts", ["topic_id"])
    op.create_index("forum_posts_user_idx", "forum_posts", ["user_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("forum_topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("chat_messages_topic_idx", "chat_messages", ["topic_id"])
    op.create_index("chat_messages_user_idx", "chat_messages", ["user_id"])


def downgrade() -> None:
    op.drop_index("chat_messages_user_idx", table_name="chat_messages")
    op.drop_index("chat_messages_topic_idx", table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_index("forum_posts_user_idx", table_name="forum_posts")
    op.drop_index("forum_posts_topic_idx", table_name="forum_posts")
    op.drop_table("forum_posts")

    op.drop_index("forum_topics_type_idx", table_name="forum_topics")
    op.drop_table("forum_topics")
