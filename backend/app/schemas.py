from pydantic import BaseModel, EmailStr
from typing import List


class User(BaseModel) :
    username : str
    email : EmailStr
    password : str
    role : int
    
class EditHistory(BaseModel) :
    inputVideo : str
    outputVideo : str
    subtitle : str
    time: str
    
class TrimVideoRequest(BaseModel):
    segment_names: List[str]
    
class Segments(BaseModel) :
    user_id : int
    segment : str
    video : str
     
class ResponseUser(BaseModel) :
    id : int
    username : str
    email : EmailStr
    role : int 

    class Config :
        from_attributes = True
        
class UserLogin(BaseModel) :
    username : EmailStr
    password : str

class Token(BaseModel) :
    access_token : str
    token_type : str

class TokenData(BaseModel) :
    id : int 
    email : str

class TokenResponse(BaseModel) :
    access_token : str
    token_type : str
    user : ResponseUser
    
    class Config :
        from_attributes = True