"""Initialize The DB again

Revision ID: 695c2606dfbe
Revises: 
Create Date: 2023-11-03 08:44:00.707908

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '695c2606dfbe'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password', sa.String(), nullable=False),
    sa.Column('role', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('edit_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('inputVideo', sa.String(), nullable=False),
    sa.Column('outputVideo', sa.String(), nullable=False),
    sa.Column('subtitle', sa.String(), nullable=False),
    sa.Column('time', sa.String(), nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
    sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('segments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
    sa.Column('segment', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('users')
    op.drop_table('edit_history')
    op.drop_table('segments')
