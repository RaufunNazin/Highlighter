from jose import JWTError, jwt
from datetime import datetime, timedelta
from . import schemas
from .database import get_db
from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models
from .database import SessionLocal
import os
from typing import Optional

SECRET_KEY = os.getenv("JWT_SECRET", "1234567890")
ALGORITHM = "HS256"
EXPIRATION_TIME = 60 * 60 * 24 * 7

# Keep the scheme for OpenAPI docs, but make it optional (we prefer cookies)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire_time = datetime.utcnow() + timedelta(minutes=EXPIRATION_TIME)
    to_encode.update({"exp": expire_time})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id = payload.get("id")
        email = payload.get("email")
    
        if not id:
            raise credentials_exception
        token_data = schemas.TokenData(id=id, email=email)
    except JWTError:
        raise credentials_exception
    return token_data

def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Extract JWT from (in priority order):
      1. httpOnly cookie named 'access_token'
      2. Authorization: Bearer header (backward compat / Swagger UI)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try httpOnly cookie first
    token = request.cookies.get("access_token")

    # 2. Fall back to Bearer header
    if not token and bearer_token:
        token = bearer_token

    if not token:
        raise credentials_exception

    token_data = verify_access_token(token, credentials_exception)
    return token_data

def check_authorization(user):
    db = SessionLocal()
    user_from_db = db.query(models.User).filter(models.User.id == user.id).first()
    if user_from_db.role != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized Access")
    db.close()
    return user_from_db