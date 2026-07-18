import hashlib
import secrets
import base64
from werkzeug.security import generate_password_hash

def generate_password_hash_scrypt(password):
    """Generate scrypt hash using hashlib"""
    salt = secrets.token_bytes(16)
    salt_b64 = base64.b64encode(salt).decode('utf-8').rstrip('=')
    
    hash_bytes = hashlib.scrypt(
        password.encode('utf-8'),
        salt=salt,
        n=32768,
        r=8,
        p=1,
        dklen=32,
        maxmem=200 * 1024 * 1024
    )
    
    hash_b64 = base64.b64encode(hash_bytes).decode('utf-8').rstrip('=')
    return f"scrypt:32768:8:1${salt_b64}${hash_b64}"

# Set your password
new_password = "W3lcom3!2E1"

# Method 1: Using werkzeug (RECOMMENDED - matches your register_user)
werkzeug_hash = generate_password_hash(new_password, method='scrypt')
print("Using Werkzeug (Recommended - matches your app):")
print(werkzeug_hash)
print("\n")

# # Method 2: Using custom scrypt
# custom_hash = generate_password_hash_scrypt(new_password)
# print("Using Custom scrypt:")
# print(custom_hash)
# print("\n")

# # SQL UPDATE statement
# email = "user@example.com"  # Change to actual user email
# print(f"SQL to update password for {email}:")
# print(f"""
# UPDATE users 
# SET password_hash = '{werkzeug_hash}', 
#     Locked = 0 
# WHERE email = '{email}';
# """)