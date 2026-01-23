from datetime import datetime, timedelta,timezone
from jose import JWTError, jwt


SECRET_KEY = "youbou"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60




def create_access_token(data: dict, expires_delta: timedelta | None = None):
    # 1. Copy the data
    to_encode = data.copy()

    # 2. Decide expiration time
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    #expires_delta represents how long the token will be valid
    # 3. Add expiration to token data
    
    to_encode["exp"] = expire
    # to_encode.update({"exp": expire})
    
    # 4. Create the JWT token
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return token

    
#jwt.encode() → create token

#jwt.decode() → read token