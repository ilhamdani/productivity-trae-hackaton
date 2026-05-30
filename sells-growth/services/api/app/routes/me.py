from fastapi import APIRouter, Depends

from ..auth import AuthContext, require_api_key

router = APIRouter()


@router.get("/me")
def me(ctx: AuthContext = Depends(require_api_key)) -> dict[str, str]:
    return {"user_id": str(ctx.user_id)}
