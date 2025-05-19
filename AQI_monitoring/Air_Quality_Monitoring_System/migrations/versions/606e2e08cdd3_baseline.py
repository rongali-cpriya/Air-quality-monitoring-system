"""baseline

Revision ID: 606e2e08cdd3
Revises: d850dd944124
Create Date: 2025-04-06 01:22:18.433224

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '606e2e08cdd3'
down_revision: Union[str, None] = 'd850dd944124'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
