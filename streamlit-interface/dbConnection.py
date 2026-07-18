import urllib.parse
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def connString():
    # Read database configuration from environment variables
    db_driver = os.getenv('DB_DRIVER')
    db_server = os.getenv('DB_SERVER')
    lh_server = os.getenv('LH_SERVER')
    db_name = os.getenv('DB_NAME')
    db_name1 = os.getenv('DB_NAME1')
    db_username = os.getenv('DB_USERNAME')
    db_password = os.getenv('DB_PASSWORD')
    openai_key = os.getenv('OPENAI_API_KEY')

    # Construct the database connection string
    db_conn_str = f"DRIVER={db_driver};SERVER={db_server};DATABASE={db_name};UID={db_username};PWD={db_password}"
    db_conn = f"DRIVER={db_driver};SERVER={db_server};DATABASE={db_name1};UID={db_username};PWD={db_password}"
    conn_str_sa = f"mssql+pymssql://{db_username}:{db_password}@{lh_server}:49423/{db_name}"
    return db_conn_str, db_conn, conn_str_sa
