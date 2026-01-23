from datetime import datetime, timedelta,timezone
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Read secrets from environment 
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")  # Default to HS256 if not set
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Safety check - crash early if SECRET_KEY is missing
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set!")

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