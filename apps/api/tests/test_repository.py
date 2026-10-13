from app.domain.entities import TokenPair
from app.infrastructure.repositories import SQLUserRepository


def test_stale_refresh_cannot_overwrite_new_session(app, logged_in):
    user_id = logged_in["user"]["id"]
    old_refresh = logged_in["token"]["refresh"]
    # Two readers may both pass the initial check before the first rotation commits.
    with app.state.session_factory() as session:
        repository = SQLUserRepository(session)
        assert repository.has_refresh(user_id, old_refresh)
        session.rollback()
        with app.state.session_factory() as winner_session:
            winner = SQLUserRepository(winner_session)
            assert winner.rotate_tokens(
                user_id, old_refresh, TokenPair("winner-access", "winner-refresh")
            )
            winner.commit()
        assert not repository.rotate_tokens(
            user_id, old_refresh, TokenPair("loser-access", "loser-refresh")
        )
        assert not repository.delete_tokens(user_id, old_refresh)
        assert repository.has_access(user_id, "winner-access")
        session.rollback()
