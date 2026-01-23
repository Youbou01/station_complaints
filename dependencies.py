from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
#“Look at the request headers, extract the token after the word Bearer, and give it to me as a string.”

# tokenUrl="login":

# Tells Swagger where login happens

# Used only for documentation & UI

# oauth2_scheme:

# A function that:

# Reads the header

# Returns the token string





# this tells FastAPI that to get a token, the client must go to the /login endpoint.
# The oauth2_scheme can then be used as a dependency in your path operations to extract and validate the token from the request.

#OAuth2PasswordBearer Extract token from the Authorization header.(header:: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...)