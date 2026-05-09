from fastapi import Depends, status, APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse
from ..database import get_db
from sqlalchemy.orm import Session
from ..schemas import Token
from .. import models, utils, oauth2

router = APIRouter()

@router.post("/login", response_model=Token, tags=['auth'])
def login_user(user_credentials: dict = Body(...), db: Session = Depends(get_db)):
    username = user_credentials.get("username")
    password = user_credentials.get("password")

    if username is None or password is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")

    user = db.query(models.User).filter(models.User.email == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found with this email")

    if not utils.verify_password(password, user.password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incorrect password")

    access_token = oauth2.create_access_token({"id": user.id, "email": user.email})

    # Return token in body AND set httpOnly cookie
    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "Bearer",
    })
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,       # Set True in production with HTTPS
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/",
    )
    return response


@router.post("/logout", tags=['auth'])
def logout_user():
    """Clear the httpOnly auth cookie."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return response
