"""Initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-14

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("google_id", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("google_id", name="uq_users_google_id"),
    )

    # --- guest_sessions ---
    op.create_table(
        "guest_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.UniqueConstraint("token", name="uq_guest_sessions_token"),
    )

    # --- lists ---
    op.create_table(
        "lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("occasion", sa.String(50), nullable=True),
        sa.Column("occasion_date", sa.Date, nullable=True),
        sa.Column("public_slug", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.UniqueConstraint("public_slug", name="uq_lists_public_slug"),
    )

    # --- items ---
    op.create_table(
        "items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "list_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("url", sa.Text, nullable=True),
        sa.Column("image_url", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "currency", sa.String(3), server_default=sa.text("'RUB'"), nullable=False
        ),
        sa.Column(
            "is_group_fund",
            sa.Boolean,
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("target_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("position", sa.Integer, server_default=sa.text("0"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # --- reservations ---
    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reserver_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "guest_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("guest_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("guest_display_name", sa.String(100), nullable=True),
        sa.Column(
            "reserved_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
    )

    # --- contributions ---
    op.create_table(
        "contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contributor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "guest_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("guest_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("guest_display_name", sa.String(100), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column(
            "contributed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_contributions_amount_positive"),
    )

    # --- url_scrape_cache ---
    op.create_table(
        "url_scrape_cache",
        sa.Column("url", sa.Text, primary_key=True),
        sa.Column("og_title", sa.Text, nullable=True),
        sa.Column("og_image", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column(
            "scraped_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # --- Indexes ---

    # lists
    op.create_index("idx_lists_owner_id", "lists", ["owner_id"])
    op.create_index("idx_lists_public_slug", "lists", ["public_slug"])

    # items
    op.create_index("idx_items_list_id", "items", ["list_id"])
    op.create_index(
        "idx_items_active",
        "items",
        ["list_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # reservations
    op.create_index("idx_reservations_item", "reservations", ["item_id"])
    # Partial UNIQUE INDEX — race-condition protection (INV-02)
    op.create_index(
        "idx_reservations_active",
        "reservations",
        ["item_id"],
        unique=True,
        postgresql_where=sa.text("released_at IS NULL"),
    )

    # contributions
    op.create_index("idx_contributions_item", "contributions", ["item_id"])

    # guest_sessions
    op.create_index("idx_guest_sessions_token", "guest_sessions", ["token"])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("idx_guest_sessions_token", table_name="guest_sessions")
    op.drop_index("idx_contributions_item", table_name="contributions")
    op.drop_index("idx_reservations_active", table_name="reservations")
    op.drop_index("idx_reservations_item", table_name="reservations")
    op.drop_index("idx_items_active", table_name="items")
    op.drop_index("idx_items_list_id", table_name="items")
    op.drop_index("idx_lists_public_slug", table_name="lists")
    op.drop_index("idx_lists_owner_id", table_name="lists")

    # Drop tables in reverse dependency order
    op.drop_table("url_scrape_cache")
    op.drop_table("contributions")
    op.drop_table("reservations")
    op.drop_table("items")
    op.drop_table("lists")
    op.drop_table("guest_sessions")
    op.drop_table("users")
