import pyodbc
from werkzeug.security import generate_password_hash, check_password_hash
import random
import streamlit as st
from dotenv import load_dotenv
import os
import requests
import jwt
import pandas as pd

# Load environment variables from .env file
load_dotenv()

class UserAuth:
    def __init__(self, db_conn_str):
        self.db_conn_str = db_conn_str
        self._create_users_table()
        self.create_eployees_table()
        self.create_chat_history_table_if_not_exists()
        self.create_user_status_table_if_not_exists()
        self.create_deviceInfo_table_if_not_exists()
        self.email = os.getenv('EMAIL')
        self.emailPassword = os.getenv('EMAIL_PASSWORD')
        self.tenant_id = os.getenv('tenant_id')
        self.client_id = os.getenv('client_id')
        self.client_secret = os.getenv('client_secret')

    # Function to update user status to the database
    def user_status_update(self, user_id):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        
        # Define the values to update
        Locked, inputUser, authoriser = 1, "System User", "System User"
        
        # Construct the UPDATE query
        query = '''
            UPDATE [dbo].[users]
            SET Locked = ?, inputUser = ?, authoriser = ?
            WHERE id = ?
        '''
        
        # Execute the query with the given values
        cursor.execute(query, (Locked, inputUser, authoriser, user_id))
        
        # Commit the changes to the database
        conn.commit()

        # Close the cursor and connection
        cursor.close()
        conn.close()

    def dbQuery(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        query = f"""
                    SELECT u.[id]
                        ,u.[email]
                        ,u.[first_name]
                        ,u.[surname]
                        ,u.[DOB]
                        ,u.[mobile_number]
                        ,u.[subscriber_number]
                        ,u.[department]
                        ,u.[profession]
                        ,u.[password_hash]
                        ,u.[user_type]
                        ,u.[Locked]
                        ,u.[inputUser]
                        ,u.[authoriser]
                        ,us.id
                        ,us.status
                        ,us.eventTime
                        ,e.id
                        ,e.address
                    FROM [zimpapersGPT].[dbo].[users] u
                    LEFT JOIN dbo.userStatus us
                    ON u.id = us.UserID
                    LEFT JOIN dbo.employees e
                    ON u.subscriber_number = e.employeeNumber 
                """
        
        cursor.execute(query)
        result = cursor.fetchall()
        df_columns=[column[0].upper() for column in cursor.description]
        df=pd.DataFrame.from_records(result, columns=df_columns)
        cursor.close()
        conn.close()

        return df

    # Function to save location data to the database
    def save_user_activity(self, user_id, status):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO userStatus (UserID, status)
            VALUES (?, ?)
            """, user_id, status)
        
        conn.commit()
        cursor.close()
        conn.close()

    def get_user_id(self, email):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return result[0]  # Assuming the id column is the first column returned
        else:
            return None
        
    def get_subscriber_number(self, user_id):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        cursor.execute("SELECT subscriber_number FROM users WHERE id = ?", (user_id))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return result[0]  # Assuming the id column is the first column returned
        else:
            return None

    def _create_users_table(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        cursor.execute('''
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE [dbo].[users](
                [id] [int] IDENTITY(1,1) PRIMARY KEY NOT NULL,
                [email] [nvarchar](255) NOT NULL,
                [first_name] [nvarchar](100) NOT NULL,
                [surname] [nvarchar](100) NOT NULL,
                [DOB] [nvarchar](10) NOT NULL,
                [mobile_number] [nvarchar](20) NOT NULL,
                [subscriber_number] [nvarchar](50) NULL,
                [department] [nvarchar](100) NULL,
                [profession] [nvarchar](100) NULL,
                [password_hash] [nvarchar](255) NOT NULL,
                [user_type] [nvarchar](50) NOT NULL,
                Locked INT NOT NULL,
                inputUser NVARCHAR(50) NOT NULL,
                authoriser NVARCHAR(50) NULL
            );
        ''')
        conn.commit()
        conn.close()

    def create_eployees_table(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        cursor.execute('''
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='employees' AND xtype='U')
            CREATE TABLE [dbo].[users](
                [id] [int] IDENTITY(1,1) PRIMARY KEY NOT NULL,
                [email] [nvarchar](255) UNIQUE NOT NULL,
                [first_name] [nvarchar](100) NOT NULL,
                [surname] [nvarchar](100) NOT NULL,
                [DOB] [nvarchar](10) NOT NULL,
                [mobile_number] [nvarchar](20) NOT NULL,
                [subscriber_number] [nvarchar](50) UNIQUE NOT NULL,
                [department] [nvarchar](100) NULL,
                [profession] [nvarchar](100) NULL,
                [password_hash] [nvarchar](255) NOT NULL,
                [user_type] [nvarchar](50) NOT NULL,
                Locked INT NOT NULL,
                inputUser NVARCHAR(50) NOT NULL,
                authoriser NVARCHAR(50) NULL
            );
        ''')
        conn.commit()
        conn.close()

    def create_deviceInfo_table_if_not_exists(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        # SQL command to create the chatHistory table if it doesn't exist
        create_table_query = """
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='DeviceInfo' AND xtype='U'
        )
        CREATE TABLE DeviceInfo (
            id INT IDENTITY(1,1) PRIMARY KEY,
            userAgent NVARCHAR(255),
            platform NVARCHAR(255),
            language NVARCHAR(255),
            screenWidth INT,
            screenHeight INT,
            connectionType NVARCHAR(50),
            providerIP NVARCHAR(50),
            machineIP NVARCHAR(50),
            latitude NVARCHAR(50),
            longitude NVARCHAR(50),
            deviceType NVARCHAR(50), -- Column for device type
            deviceBrand NVARCHAR(50), -- Column for device brand
            deviceModel NVARCHAR(50), -- Column for device model
            collectionTime DATETIME DEFAULT GETDATE(), -- Column for timestamp, default to current time
            UserID INT NOT NULL,
            FOREIGN KEY(UserID) REFERENCES [dbo].[users] ([id])
        );
        """

        cursor.execute(create_table_query)
        conn.commit()
        conn.close()

    
    def create_chat_history_table_if_not_exists(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        # SQL command to create the chatHistory table if it doesn't exist
        create_table_query = """
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='chatHistory' AND xtype='U'
        )
        CREATE TABLE chatHistory (
            user_id INT,
            user_input TEXT,
            llm_response TEXT,
            sources TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """

        cursor.execute(create_table_query)
        conn.commit()
        conn.close()

    def create_user_status_table_if_not_exists(self):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()

        # SQL command to create the chatHistory table if it doesn't exist
        create_table_query = """
        IF NOT EXISTS (
            SELECT * FROM sysobjects WHERE name='userStatus' AND xtype='U'
        )
        CREATE TABLE userStatus (
            id INT IDENTITY(1,1) PRIMARY KEY,
            status NVARCHAR(255),
            eventTime DATETIME DEFAULT GETDATE(), -- Column for timestamp, default to current time
            UserID INT NOT NULL,
            FOREIGN KEY(UserID) REFERENCES [dbo].[users] ([id])
        );
        """

        cursor.execute(create_table_query)
        conn.commit()
        conn.close()

    def register_user(self, email, password, first_name, surname, DOB, mobile_number, subscriber_number=None, 
                      department=None, profession=None, user_type="Guest", Locked = 0, inputUser = "System User",
                      authoriser = "System User"):
        password_hash = generate_password_hash(password)
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        if user_type == "Staff":
            # SQL query with placeholder for email
            query = '''
                SELECT first_name, surname, DOB, mobile_number, employeeNumber, department, jobTitle
                FROM employees
                WHERE email = ?
            '''
            
            # Execute the query, passing the email parameter
            cursor.execute(query, (email,))  # Pass email as a parameter
            user = cursor.fetchone()
            if user is not None:
                first_name, surname, DOB, mobile_number, subscriber_number = user[0], user[1], user[2], user[3], user[4]
                department, profession = user[5], user[6]
        else:
            # Count the number of external users
            cursor.execute("SELECT COUNT(*) FROM dbo.users WHERE user_type = 'External'")
            count = cursor.fetchone()[0]
            
            # Increment the count for the new subscriber number
            subscriber_number = f"ZP{count + 1:03d}S"  # Formats the count as a 3-digit number
        
        try:
            cursor.execute('''
                INSERT INTO users (email, first_name, surname, DOB, mobile_number, subscriber_number, department, profession, password_hash, user_type, Locked, inputUser, authoriser)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (email, first_name, surname, DOB, mobile_number, subscriber_number, department, profession, password_hash, user_type, Locked, inputUser, authoriser))
            conn.commit()
        except pyodbc.IntegrityError as e:
            print(f"Registration failed: {e}")
            return False  # Email already registered
        finally:
            cursor.close()
            conn.close()
        return True
    
    def login_user(self, email, password):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        # Use parameterized query to avoid SQL injection and syntax issues
        query = '''
            SELECT u.id
                ,u.first_name
                ,u.surname
                ,u.password_hash
                ,u.user_type
                ,u.locked
                ,u.authoriser
                ,e.jobTitle
            FROM dbo.users u
            LEFT JOIN dbo.employees e
            ON 
            u.email = e.email
            WHERE u.email = ?
            '''

        cursor.execute(query, (email,))  # Pass email as a parameter
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user is None:
            return "Unregistered", None, None, None, None
        else:
            if (user and check_password_hash(user[3], password)) and (user[4] != 1) and (user[5] != None):
                # Store user ID and email in Streamlit session state
                st.session_state['user_id'] = user[0]
                st.session_state['user_name'] = ' '.join([user[1].strip(), user[2].strip()])
                st.session_state['email'] = email
                st.session_state['userType'] = user[4]
                st.session_state['jobTitle'] = user[7]
                return "success", st.session_state['user_id'], st.session_state['user_name'], st.session_state['userType'], st.session_state['jobTitle']  # Return the user_id and username
            elif (user and check_password_hash(user[3], password)) and (user[5] == 1):
                # Store user ID and email in Streamlit session state
                st.session_state['user_id'] = user[0]
                st.session_state['user_name'] = ' '.join([user[1].strip(), user[2].strip()])
                st.session_state['email'] = email
                st.session_state['userType'] = user[4]
                st.session_state['jobTitle'] = user[7]
                return "Locked", st.session_state['user_id'], st.session_state['user_name'], st.session_state['userType'], st.session_state['jobTitle']  # Return the user_id and username
            elif (user and check_password_hash(user[3], password)) and (user[6] == None):
                # Store user ID and email in Streamlit session state
                st.session_state['user_id'] = user[0]
                st.session_state['user_name'] = ' '.join([user[1].strip(), user[2].strip()])
                st.session_state['email'] = email
                st.session_state['userType'] = user[4]
                st.session_state['jobTitle'] = user[7]
                return "Unauthorised User", st.session_state['user_id'], st.session_state['user_name'], st.session_state['userType'], st.session_state['jobTitle']  # Return the user_id and username
            elif (str(user[0]).isdigit()) & (check_password_hash(user[3], password)==False):
                # Store user ID and email in Streamlit session state
                st.session_state['user_id'] = user[0]
                st.session_state['user_name'] = ' '.join([user[1].strip(), user[2].strip()])
                st.session_state['email'] = email
                st.session_state['userType'] = user[4]
                return "Wrong password", st.session_state['user_id'], st.session_state['user_name'], st.session_state['userType'], st.session_state['jobTitle']  # Return the user_id and username
            return "False", None, None, None, None

    def send_reset_code(self, email):
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email=?', (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return None

        reset_code = str(random.randint(100000, 999999))

        # Send reset code via email
        access_token = self.get_access_token()
        if access_token:
            self._send_email(access_token, email, "Password Reset Code", f"Your reset code is {reset_code}")
        else:
            print("Failed to retrieve access token.")
            return None

        return "success", reset_code

    def decode_token(self, token):
        # Decode the JWT token without verification (for inspection purposes)
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            return decoded
        except Exception as e:
            print(f"Error decoding token: {e}")
            return None

    def get_access_token(self):
        url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        body = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }
        response = requests.post(url, headers=headers, data=body)

        # Debugging: Log response status and content
        print(f"Access Token Request Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error Response: {response.text}")
            return None

        response.raise_for_status()
        return response.json().get('access_token')
    
    def _send_email(self, access_token, email, subject, body):
        url = f"https://graph.microsoft.com/v1.0/users/{self.email}/sendMail"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": email
                        }
                    }
                ]
            }
        }
        response = requests.post(url, headers=headers, json=payload)
        
        # Check status code
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 202:
            print("Email sent successfully.")
        else:
            try:
                response_json = response.json()
            except ValueError:
                response_json = {"error": "Unable to decode response as JSON."}
            
            print(f"Failed to send email. Response Text: {response.text}")
            print(f"Response JSON: {response_json}")
        
        response.raise_for_status()

    def update_password(self, email, new_password):
        password_hash = generate_password_hash(new_password)
        conn = pyodbc.connect(self.db_conn_str)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users
            SET password_hash=?
            WHERE email=?
        ''', (password_hash, email))
        conn.commit()
        cursor.close()
        conn.close()

        return "success"
