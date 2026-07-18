import time
import streamlit as st
from userManagement import UserAuth
from dbConnection import connString
import phonenumbers
from phonenumbers import NumberParseException
import re

# Initialize UserAuth
auth = UserAuth(db_conn_str=connString()[0])

# Define reset code timeout in seconds
RESET_CODE_TIMEOUT = 600

def handle_login():
    email = st.text_input("Email")
    password = st.text_input("Password", type='password')

    # Track login attempts in session state to persist across reruns
    if "login_attempts" not in st.session_state:
        st.session_state.login_attempts = 0  # Initialize with 0 attempts

    if st.button("Login"):
        # Increment the number of login attempts
        attempts = st.session_state.login_attempts
        
        if attempts >= 3:
            st.error("🔴 Maximum retries exhausted, your account is locked. Please reset your password or contact administrator.")
            return

        # Call login_user once and unpack response
        status, user_id, user_name, userType, jobTitle = auth.login_user(email, password)
        auth_response = {
            "status": status,
            "user_id": user_id,
            "user_name": user_name,
            "user_type": userType,
            "jobTitle": jobTitle
        }

        if auth_response["status"] == "success":
            # Reset login attempts on successful login
            st.session_state.login_attempts = 0
            st.session_state.authenticated = True
            st.session_state.user_id = auth_response["user_id"]
            st.session_state.user_name = auth_response["user_name"]
            st.session_state.email = email
            st.session_state.userType = auth_response["user_type"]
            st.session_state.reset_code = None
            st.session_state.on_landing_page = True
            st.session_state.chat_history = []
            st.session_state.user_input = ''
            st.session_state.doc_info = None
            st.session_state.login_event_saved = False
            st.session_state.jobTitle = auth_response["jobTitle"]
            st.success(f"Welcome, {auth_response['user_name']}!")
            st.rerun()  # Rerun to refresh the interface
            return auth_response
        
        handle_login_errors(auth_response, email)

def handle_login_errors(auth_response, email):
    if auth_response["status"] == "Locked":
        user_name = auth_response["user_name"]
        st.error(f"🔴 Login failed! User {user_name} is locked. Please contact the administrator.")
    elif auth_response["status"] == "Unauthorised User":
        user_name = auth_response["user_name"]
        st.error(f"🔴 Login failed! User {user_name} is not authorised to access the system at this time. Please contact the administrator.")
    elif auth_response["status"] == "Unregistered":
        st.error(f"🔴 {email} is not registered. Please choose 'Sign Up' on the mode above to register.")
    elif auth_response["status"] == "Wrong password":
        handle_incorrect_credentials(auth_response)
    # else:
    #     handle_incorrect_credentials(auth_response)

def handle_incorrect_credentials(auth_response):
    attempts = st.session_state.login_attempts + 1  # Increment attempts on failure
    remaining_attempts = 3 - attempts
    st.session_state.login_attempts = attempts

    if remaining_attempts != 0:
        st.error(f"🔴 Login failed! Either email or password is incorrect. {remaining_attempts} attempts remaining, please try again.")
    else:
        if auth_response["user_id"] is not None:
            user_id = auth_response["user_id"]
            auth.user_status_update(user_id)  # Lock the user in the database
            st.error("🔴 Maximum retries exhausted. Your account is now locked. Please reset your password or contact the administrator.")

# Function to validate email
def validate_email(email):
    email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(email_pattern, email)), email

# Function to validate email for the specific domain
def validate_staff_email(email):
    email_pattern = r'^[a-zA-Z0-9_.+-]+@zimpapers\.co\.zw$'
    return bool(re.match(email_pattern, email)), email

# Function to validate mobile number
def validate_mobile_number(number):
    try:
        parsed_number = phonenumbers.parse(number, None)
        if phonenumbers.is_possible_number(parsed_number) and phonenumbers.is_valid_number(parsed_number):
            return True, phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
        else:
            return False, "Invalid number."
    except NumberParseException as e:
        return False, str(e)

def get_valid_email():
    # Check if a valid email is already stored in session state
    if 'email_validated' in st.session_state:
        return st.session_state.email_validated  # Return the validated email if it exists
    
    email = st.text_input("Please enter your email:", key="valid_email", on_change=validate_email_input)

    # Check if the Enter key was pressed by using the `session_state` to store the state
    if st.session_state.get("email_validated", False):
        st.success("✅ Valid Email")
        st.session_state.email_validated = False  # Reset for future inputs
        return email
    elif email:
        st.error("❌ Invalid Email. Please try again.")
    else:
        st.warning("⚠️ Please enter an email.")

    return None

def get_valid_staff_email():
    # Check if a valid email is already stored in session state
    if 'staff_email' in st.session_state:
        return st.session_state.staff_email  # Return the validated email if it exists

    email = st.text_input("Enter your staff email to register", key="valid_staff_email", on_change=validate_staff_email_input)

    # Check if the Enter key was pressed and the email is validated
    if st.session_state.get("staff_email_validated", False):
        st.session_state.staff_email = email  # Store validated email in session state
        st.success("✅ Valid Email")
        st.session_state.staff_email_validated = False  # Reset for future inputs
        return email
    elif email:
        st.error("❌ Invalid Email. Please enter a valid Zimpapers staff email to register.")
    else:
        st.warning("⚠️ Please enter an email.")

    return None


def get_valid_mobile_number():
    # Check if a valid email is already stored in session state
    if 'mobile_number_validated' in st.session_state:
        return st.session_state.mobile_number_validated  # Return the validated email if it exists
    
    number = st.text_input("Enter your mobile number (e.g., +263712345678):", key="valid_mobile_number", on_change=validate_mobile_number_input)

    # Check if the Enter key was pressed by using the `session_state` to store the state
    if st.session_state.get("mobile_number_validated", False):
        st.success(f"✅ Valid Mobile Number: {number}")
        st.session_state.mobile_number_validated = False  # Reset for future inputs
        return number
    elif number:
        is_valid, message = validate_mobile_number(number)
        if not is_valid:
            st.error(f"❌ {message} Please enter a valid mobile number.")
    else:
        st.warning("⚠️ Please enter a mobile number.")

    return 

def validate_email_input():
    email = st.session_state.valid_email
    st.session_state.email_validated = validate_email(email)

def validate_staff_email_input():
    email = st.session_state.valid_staff_email
    st.session_state.staff_email_validated = validate_staff_email(email)

def validate_mobile_number_input():
    number = st.session_state.valid_mobile_number
    is_valid = validate_mobile_number(number)
    st.session_state.mobile_number_validated = is_valid

def handle_registration():
    user_type = st.radio(label="Are you staff of Zimpapers or an external user?:", options=["Staff", "External"])
    if (user_type == "Staff"):
        email = get_valid_staff_email()
    else:
        email = get_valid_email()
    
    password = st.text_input("Password", type="password", key="password")
    confirm_password = st.text_input("Confirm Password", type="password", key="confirm_password")
    first_name = st.text_input("Please enter First Name", key="first_name") if user_type == "External" else None
    surname = st.text_input("Please enter Surname", key="surname") if user_type == "External" else None
    DOB = st.date_input("Please select your date of birth", key="dob").strftime('%Y-%m-%d') if user_type == "External" else None
    mobile_number = get_valid_mobile_number() if user_type == "External" else None
    profession = st.text_input("Please enter your Profession", key="profession") if user_type == "External" else None
    if (email is not None) & (mobile_number is not None):
        email = email[1] if user_type == 'External' else email
        mobile_number = mobile_number[1] if user_type == 'External' else mobile_number

    if st.button("Sign Up"):
        if password == confirm_password:
            user_id = auth.register_user(email, password, first_name, surname, DOB, mobile_number, user_type=user_type, profession=profession)
            if user_id:
                st.success('Signed up successfully! Please select "log in" option above to log in.', icon="🟢")
            else:
                st.error("🔴 Failed to sign up. Email might already be registered.")
        else:
            st.error("🔴 Passwords do not match.")

def handle_password_reset():
    email = st.text_input("Email")
    
    # Display reset code input and confirm button if reset code has been sent
    if "reset_code_sent_time" in st.session_state:
        elapsed_time = time.time() - st.session_state.reset_code_sent_time
        if elapsed_time > RESET_CODE_TIMEOUT:
            st.session_state.reset_code_timeout = True
            st.session_state.reset_code_input = None
            st.session_state.reset_code_sent_time = None
            st.session_state.reset_code_verified = False
            st.warning("The reset code has expired. Please request a new one.")
            if st.button("Resend Code"):
                resend_reset_code(email)
        else:
            remaining_time = RESET_CODE_TIMEOUT - int(elapsed_time)
            st.write(f"Reset code is valid for {remaining_time} seconds.")
    
    if st.button("Send Reset Code") and "reset_code_sent_time" not in st.session_state:
        # Send reset code
        reset_response = {"status": auth.send_reset_code(email)[0], "reset_code": auth.send_reset_code(email)[1]}
        if reset_response["status"] == "success":
            st.success("A password reset code has been sent to your email.")
            st.session_state.email = email
            st.session_state.reset_code = reset_response["reset_code"]
            st.session_state.reset_code_sent_time = time.time()
            st.session_state.reset_code_timeout = False
            st.session_state.reset_code_verified = False
        else:
            st.error(reset_response["message"])

def resend_reset_code(email):
    reset_response = {"status": auth.send_reset_code(email)[0], "reset_code": auth.send_reset_code(email)[1]}
    if reset_response["status"] == "success":
        st.success("A new password reset code has been sent to your email.")
        st.session_state.email = email
        st.session_state.reset_code = reset_response["reset_code"]
        st.session_state.reset_code_sent_time = time.time()
        st.session_state.reset_code_timeout = False
        st.session_state.reset_code_verified = False
    else:
        st.error(reset_response["message"])

def handle_reset_password():
    reset_code = st.text_input("Reset Code")
    new_password = st.text_input("New Password", type="password")
    confirm_new_password = st.text_input("Confirm New Password", type="password")

    if st.button("Reset Password"):
        if new_password == confirm_new_password:
            reset_response = auth.reset_password(st.session_state.email, reset_code, new_password)
            if reset_response["status"] == "success":
                st.success("Your password has been reset successfully!")
                st.session_state.reset_code_sent_time = None  # Clear the timer
                st.session_state.reset_code_verified = False
            else:
                st.error(reset_response["message"])
        else:
            st.error("🔴 New passwords do not match.")

