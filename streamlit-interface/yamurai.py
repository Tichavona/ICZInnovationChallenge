import streamlit as st
import pandas as pd
import warnings
import plotly.express as px 
import plotly.figure_factory as ff
from authentication import *
import requests
from htmlTemplate import css, bot_template, user_template
from dataHarvesting import main as dtMain
from dbConnection import connString
from userManagement import UserAuth
from streamlit_mic_recorder import mic_recorder
from utils import load_config, get_avatar
from helperFunctions import *
from imageHandler import handle_image
from audioHandler import transcribe_audio
from uploadHandler import uploadHandler
from databaseOperations import load_last_k_text_messages, save_text_message, save_image_message, save_audio_message, load_messages, get_all_chat_history_ids, delete_chat_history
import sqlite3
import os
import base64
import shutil
from werkzeug.utils import secure_filename
import base64
from glob import glob as gb
from pathlib import Path 
from datetime import datetime

warnings.filterwarnings('ignore')
config = load_config()

auth = UserAuth(db_conn_str=connString()[0])

def payment_successful():
    # Display payment options and simulate a payment process
    st.session_state['payment_popup'] = True  # Show payment modal
    st.markdown("<script>alert('Simulating payment.');</script>", unsafe_allow_html=True)
    # Return True for this example, but actual implementation would check payment success
    return True

def tempfolderDelete(tempDirectory):
    if os.path.exists(tempDirectory):
        shutil.rmtree(tempDirectory)

@st.cache_data
def encode_pdf(file_path):
    """Encodes a PDF file in base64 format."""
    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
            return base64.b64encode(file_content).decode("utf-8")
    except Exception as e:
        st.error("Failed to encode the file.")
        return None

def displayPDF(file_path, unique_key, base64_pdf):
    """Displays the encoded PDF file in an iframe."""
    if base64_pdf:
        pdf_display = f'<iframe id="pdf-frame-{unique_key}" src="data:application/pdf;base64,{base64_pdf}#toolbar=0" width="100%" height="450"></iframe>'
        st.markdown(pdf_display, unsafe_allow_html=True)
    else:
        st.error("Could not load PDF preview.")

def copy_file_to_temp(view_url, temp_pdf_path):
    try:
        shutil.copy(view_url, temp_pdf_path)
        return True
    except IOError as e:
        st.error(f"File copy failed: {e}")
        return False
   
def display_chat_history(subscriber_number, userProfilePic):
    # Create unique temp folder for user session
    tempDirectory = f"./temp{subscriber_number}"
    tempfolderDelete(tempDirectory)  # Clear temp directory for this session
    # Display current chat
    for idx, chat in enumerate(reversed(st.session_state.chat_history)):
        for key in chat:
            if key == 'user':
                st.write(user_template.replace("{{MSG}}", chat['user']).replace("{{userProfilePic}}", userProfilePic), unsafe_allow_html=True)
            elif key == 'llm':
                st.write(bot_template.replace("{{MSG}}", chat['llm']), unsafe_allow_html=True)
            else:
                if chat['sources']:
                    st.markdown("**Sources:**")
                    grouped_sources = {}

                    # Group sources by file name
                    for source in chat['sources']:
                        file_name = source['source'].split(os.sep)[-1]
                        if file_name not in grouped_sources:
                            grouped_sources[file_name] = []
                        grouped_sources[file_name].append({
                            'Page number': source['Page number'],
                            'Page Content': source['Page Content']
                        })

                    # Display files in two columns
                    file_count = len(grouped_sources)
                    file_names = list(grouped_sources.keys())

                    if idx == 0:
                        os.makedirs(os.path.dirname(tempDirectory), exist_ok=True)
                        for i in range(0, file_count, 2):
                            col1, col2 = st.columns(2)

                            # Display first file in col1
                            if i < file_count:
                                file_name = file_names[i]
                                temp_pdf_path = f"./temp{subscriber_number}/{file_name}"
                                directory = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/pdfUploads"
                                file_path = os.path.join(directory, secure_filename(file_name))
                                os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

                                with col1:
                                    if copy_file_to_temp(file_path, temp_pdf_path):
                                        base64_pdf = encode_pdf(temp_pdf_path)
                                        displayPDF(temp_pdf_path, unique_key=f"{file_name}-col1", base64_pdf=base64_pdf)
                                        
                                        # Widgets outside the cached function
                                        buttonCol1, buttonCol2 = st.columns(2)
                                        
                                        # Refresh button
                                        with buttonCol1:
                                            if st.button("Refresh Preview", key=f"refresh-{file_name}-col1"):
                                                st.markdown(f"""
                                                    <script>
                                                        document.getElementById('pdf-frame-{file_name}-col1').src += '';
                                                    </script>
                                                """, unsafe_allow_html=True)

                                        # Download button with simulated payment
                                        with buttonCol2:
                                            if st.button("Download File", key=f"download-{file_name}-col1"):
                                                if payment_successful():
                                                    download_link = f'<a href="data:application/pdf;base64,{base64_pdf}" download="{file_name}">Click here to download</a>'
                                                    st.success("Payment successful! Please download your file below.")
                                                    st.markdown(download_link, unsafe_allow_html=True)
                                                else:
                                                    st.error("Payment failed. Please try again.")
                                    else:
                                        st.error(f"Unable to copy and display PDF for {file_name}")

                            # Display second file in col2 if it exists
                            if i + 1 < file_count:
                                file_name = file_names[i + 1]
                                temp_pdf_path = f"./temp{subscriber_number}/{file_name}"
                                file_path = os.path.join(directory, secure_filename(file_name))
                                os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

                                with col2:
                                    if copy_file_to_temp(file_path, temp_pdf_path):
                                        base64_pdf = encode_pdf(temp_pdf_path)
                                        displayPDF(temp_pdf_path, unique_key=f"{file_name}-col2", base64_pdf=base64_pdf)

                                        # Widgets outside the cached function
                                        buttonCol1, buttonCol2 = st.columns(2)
                                        
                                        # Refresh button
                                        with buttonCol1:
                                            if st.button("Refresh Preview", key=f"refresh-{file_name}-col2"):
                                                st.markdown(f"""
                                                    <script>
                                                        document.getElementById('pdf-frame-{file_name}-col2').src += '';
                                                    </script>
                                                """, unsafe_allow_html=True)

                                        # Download button with simulated payment
                                        with buttonCol2:
                                            if st.button("Download File", key=f"download-{file_name}-col2"):
                                                if payment_successful():
                                                    download_link = f'<a href="data:application/pdf;base64,{base64_pdf}" download="{file_name}">Click here to download</a>'
                                                    st.success("Payment successful! Please download your file below.")
                                                    st.markdown(download_link, unsafe_allow_html=True)
                                                else:
                                                    st.error("Payment failed. Please try again.")
                                    else:
                                        st.error(f"Unable to copy and display PDF for {file_name}")

        st.markdown("---")

def display_same_chat_history(subscriber_number, userProfilePic):
    
    # Display current chat
    for idx, chat in enumerate(reversed(st.session_state.chat_history)):
        for key in chat:
            if key == 'user':
                st.write(user_template.replace("{{MSG}}", chat['user']).replace("{{userProfilePic}}", userProfilePic), unsafe_allow_html=True)
            elif key == 'llm':
                st.write(bot_template.replace("{{MSG}}", chat['llm']), unsafe_allow_html=True)
            else:
                if chat['sources']:
                    st.markdown("**Sources:**")
                    grouped_sources = {}

                    # Group sources by file name
                    for source in chat['sources']:
                        file_name = source['source'].split(os.sep)[-1]
                        if file_name not in grouped_sources:
                            grouped_sources[file_name] = []
                        grouped_sources[file_name].append({
                            'Page number': source['Page number'],
                            'Page Content': source['Page Content']
                        })

                    # Display files in two columns
                    file_count = len(grouped_sources)
                    file_names = list(grouped_sources.keys())

                    if idx == 0:
                        for i in range(0, file_count, 2):
                            col1, col2 = st.columns(2)

                            # Display first file in col1
                            if i < file_count:
                                file_name = file_names[i]
                                temp_pdf_path = f"./temp{subscriber_number}/{file_name}"
                                directory = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/pdfUploads"
                                file_path = os.path.join(directory, secure_filename(file_name))
                                os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

                                with col1:
                                    if copy_file_to_temp(file_path, temp_pdf_path):
                                        base64_pdf = encode_pdf(temp_pdf_path)
                                        displayPDF(temp_pdf_path, unique_key=f"{file_name}-col1", base64_pdf=base64_pdf)
                                        
                                        # Widgets outside the cached function
                                        buttonCol1, buttonCol2 = st.columns(2)
                                        
                                        # Refresh button
                                        with buttonCol1:
                                            if st.button("Refresh Preview", key=f"refresh-{file_name}-col1"):
                                                st.markdown(f"""
                                                    <script>
                                                        document.getElementById('pdf-frame-{file_name}-col1').src += '';
                                                    </script>
                                                """, unsafe_allow_html=True)

                                        # Download button with simulated payment
                                        with buttonCol2:
                                            if st.button("Download File", key=f"download-{file_name}-col1"):
                                                if payment_successful():
                                                    download_link = f'<a href="data:application/pdf;base64,{base64_pdf}" download="{file_name}">Click here to download</a>'
                                                    st.success("Payment successful! Please download your file below.")
                                                    st.markdown(download_link, unsafe_allow_html=True)
                                                else:
                                                    st.error("Payment failed. Please try again.")
                                    else:
                                        st.error(f"Unable to copy and display PDF for {file_name}")

                            # Display second file in col2 if it exists
                            if i + 1 < file_count:
                                file_name = file_names[i + 1]
                                temp_pdf_path = f"./temp{subscriber_number}/{file_name}"
                                file_path = os.path.join(directory, secure_filename(file_name))
                                os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)

                                with col2:
                                    if copy_file_to_temp(file_path, temp_pdf_path):
                                        base64_pdf = encode_pdf(temp_pdf_path)
                                        displayPDF(temp_pdf_path, unique_key=f"{file_name}-col2", base64_pdf=base64_pdf)

                                        # Widgets outside the cached function
                                        buttonCol1, buttonCol2 = st.columns(2)
                                        
                                        # Refresh button
                                        with buttonCol1:
                                            if st.button("Refresh Preview", key=f"refresh-{file_name}-col2"):
                                                st.markdown(f"""
                                                    <script>
                                                        document.getElementById('pdf-frame-{file_name}-col2').src += '';
                                                    </script>
                                                """, unsafe_allow_html=True)

                                        # Download button with simulated payment
                                        with buttonCol2:
                                            if st.button("Download File", key=f"download-{file_name}-col2"):
                                                if payment_successful():
                                                    download_link = f'<a href="data:application/pdf;base64,{base64_pdf}" download="{file_name}">Click here to download</a>'
                                                    st.success("Payment successful! Please download your file below.")
                                                    st.markdown(download_link, unsafe_allow_html=True)
                                                else:
                                                    st.error("Payment failed. Please try again.")
                                    else:
                                        st.error(f"Unable to copy and display PDF for {file_name}")

        st.markdown("---")

# Function to load image and convert to base64
def get_base64_image(image_path):
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode("utf-8")
    return base64_image

def save_uploaded_image(uploaded_image, subscriber_number):
    file_name = uploaded_image.name
    # Define the file path
    folder_path = f"./profiles/{subscriber_number}"
    
    # Create the directory if it doesn't exist
    os.makedirs(folder_path, exist_ok=True)
    
    # Define the complete file path where the image will be saved
    image_path = os.path.join(folder_path, file_name)
    
    # Save the uploaded image to the specified path
    with open(image_path, "wb") as f:
        f.write(uploaded_image.getbuffer())  # Save the file as binary

    return image_path

def main():
    # Main application logic
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'doc_info' not in st.session_state:
        st.session_state.doc_info = None
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    if 'user_input' not in st.session_state:
        st.session_state.user_input = ''
    if 'on_landing_page' not in st.session_state:
        st.session_state.on_landing_page = True
    if 'userType' not in st.session_state:
        st.session_state.userType = 'External'
    if 'jobTitle' not in st.session_state:
        st.session_state.jonTitle = None
    if 'mode' not in st.session_state:
        st.session_state.mode = "Government"  # Default to "Government"
    if 'source' not in st.session_state:
        st.session_state.source = "Flat file"

    if st.session_state.authenticated:

        # Dynamically set the page config based on the mode
        if st.session_state.mode == "Reports":
            st.set_page_config(page_title="Yamurai/Sizani Analytics", page_icon=":bar_chart:", layout="wide")
        else:
            st.set_page_config(page_title="Yamurai/Sizani - AI Civil Protection", page_icon="./images/Yamurai.png", layout="wide")

        subscriber_number = auth.get_subscriber_number(st.session_state.user_id)
        folder_path = f'./profiles/{subscriber_number}'
        # Create the directory if it doesn't exist
        os.makedirs(folder_path, exist_ok=True)
        fileList = gb(f'./profiles/{subscriber_number}/*.*g')
        # Find the file with the most recent modification time and Check if there are files in the directory
        if len(fileList) != 0:
            # Find the file with the most recent modification time
            fileName = max(fileList, key=os.path.getmtime)
            userProfilePic = get_base64_image(fileName)
        else:
            # Handle the case where no files are found
            st.write("No profile image found for this user.")
            userProfilePic = ""  # Or use a default base64 image string if needed
        st.write(css, unsafe_allow_html=True)

        st.sidebar.write(f"Welcome, {st.session_state.user_name}")
        st.sidebar.image("./images/Yamurai.jpg", use_column_width=True)

        if "db_conn" not in st.session_state:
            st.session_state.session_key = "new_session"
            st.session_state.new_session_key = None
            st.session_state.session_index_tracker = "new_session"
            st.session_state.db_conn = sqlite3.connect(config["chat_sessions_database_path"], check_same_thread=False)
            st.session_state.audio_uploader_key = 0
            st.session_state.pdf_uploader_key = 1
        if st.session_state.session_key == "new_session" and st.session_state.new_session_key != None:
            st.session_state.session_index_tracker = st.session_state.new_session_key
            st.session_state.new_session_key = None

        if not st.session_state.login_event_saved:
            dtMain(st.session_state.user_id)
            auth.save_user_activity(st.session_state.user_id, "Logged In")
            st.session_state.login_event_saved = True

        if st.sidebar.button("Logout"):
            auth.save_user_activity(st.session_state.user_id, "Logged Out")
            st.session_state.authenticated = False
            st.session_state.email = None
            st.session_state.user_id = None
            st.session_state.user_name = None
            st.session_state.reset_code = None
            st.session_state.doc_info = None
            st.session_state.login_event_saved = False
            st.session_state.on_landing_page = True
            st.session_state.userType = None
            st.session_state.login_attempts = 0
            st.session_state.reset_code = None
            st.session_state.chat_history = []
            st.session_state.user_input = ''
            st.session_state.jobTitle = None

            st.rerun()

        if (st.session_state.on_landing_page) & (st.session_state.userType == 'External'):
            st.title("Welcome to Yamurai/Sizani - AI Civil Protection Assistant")
            st.write("""
                **About Yamurai/Sizani AI Civil Protection Assistant:**  
                Yamurai/Sizani is an AI-powered civil protection chatbot designed to assist citizens, government officials, 
                and agricultural stakeholders with emergency response, disaster management, and public safety information. 
                The system provides real-time alerts, guidance on civil protection protocols, and access to critical 
                information for both government agencies and agricultural communities.

                **Use Cases:**  
                - **Government:** Emergency response coordination, disaster management, public safety alerts, and civil protection protocols.
                - **Agriculture:** Weather alerts, crop disease warnings, farming safety guidelines, and agricultural emergency response.
                
                **Functionality:**  
                - Real-time emergency alerts and notifications
                - Disaster management guidance and protocols
                - Agricultural weather and crop disease warnings
                - Interactive chat for civil protection inquiries
                - Document analysis for emergency plans and policies

                **Get Started:**  
                Click the button below to start interacting with Yamurai/Sizani civil protection assistant.
            """)

            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        elif (st.session_state.on_landing_page) & (st.session_state.userType != 'External') & (st.session_state.jobTitle not in ['Deputy General Manager']):
            st.title("Welcome to Yamurai/Sizani - Government & Agriculture Civil Protection")
            st.write("""
                **About Yamurai/Sizani AI Civil Protection Assistant:**  
                Yamurai/Sizani is an AI-powered civil protection chatbot designed to assist government agencies and 
                agricultural stakeholders with emergency response, disaster management, and public safety information. 
                The system provides real-time alerts, guidance on civil protection protocols, and access to critical 
                information for both sectors.

                **Use Cases:**  
                - **Government:** Emergency response coordination, disaster management, public safety alerts, and civil protection protocols.
                - **Agriculture:** Weather alerts, crop disease warnings, farming safety guidelines, and agricultural emergency response.
                
                **Functionality:**  
                - Real-time emergency alerts and notifications
                - Disaster management guidance and protocols
                - Agricultural weather and crop disease warnings
                - Interactive chat for civil protection inquiries
                - Document analysis for emergency plans and policies

                **Get Started:**  
                Click the button below to start interacting with Yamurai/Sizani civil protection assistant.
            """)

            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        elif (st.session_state.on_landing_page) & (st.session_state.userType != 'External') & (st.session_state.jobTitle in ['Deputy General Manager', 'Administrator']):
            st.title("Welcome to Yamurai/Sizani Civil Protection Management Platform")
            st.write("""
                **About Yamurai/Sizani AI Civil Protection Management Platform:**  
                The platform incorporates an AI-powered civil protection assistant designed to support government 
                agencies and agricultural stakeholders with emergency response coordination, disaster management, 
                and public safety monitoring. It offers comprehensive analytics dashboards for monitoring civil 
                protection operations and emergency response effectiveness.

                **Use Cases:**  
                - **Government:** Emergency response coordination, disaster management, public safety alerts, and civil protection protocols.
                - **Agriculture:** Weather alerts, crop disease warnings, farming safety guidelines, and agricultural emergency response.
                - **Management:** Operational dashboards for monitoring civil protection effectiveness and resource allocation.
                
                **Functionality:**  
                - Real-time emergency alerts and notifications
                - Disaster management guidance and protocols
                - Agricultural weather and crop disease warnings
                - Interactive chat for civil protection inquiries
                - Management dashboards for decision support

                **Get Started:**  
                Click the button below to start interacting with Yamurai/Sizani civil protection platform.
            """)

            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        else:
            if (st.session_state.userType == 'External'):

                st.sidebar.title("Chat Sessions")
                chat_sessions = ["new_session"] + get_all_chat_history_ids(st.session_state.user_id)   

                index = chat_sessions.index(st.session_state.session_index_tracker)
                st.sidebar.selectbox("Select a chat session", chat_sessions, key="session_key", index=index)
                pdf_toggle_col = st.sidebar
                pdf_toggle_col.toggle("Yamurai/Sizani Chat", key="yamurai_chat", value=False)
                delete_chat_col, clear_cache_col = st.sidebar.columns(2)
                delete_chat_col.button("Delete Chat Session", on_click=delete_chat_session_history)
                clear_cache_col.button("Clear Session Cache", on_click=clear_cache)
                
                # Main Page: LLM Chat Interface
                st.sidebar.header("Upload Civil Protection Documents")
                
                uploaded_files = st.sidebar.file_uploader("Choose emergency plans, policies, or guidelines", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True)
                
                profilePicture = st.sidebar.file_uploader("Upload a profile picture", type=["jpeg", "png", "jpg"], key="Profile Picture")

                modeDB = st.sidebar.selectbox("Choose Database:", ["My Data", "Government", "Agriculture"])
                
                submit_button = st.sidebar.button("Submit")

                if submit_button and uploaded_files and modeDB:
                    uploadHandler(subscriber_number, uploaded_files, modeDB)
                elif submit_button and profilePicture:
                    image_path = save_uploaded_image(profilePicture, subscriber_number)
                    if image_path:
                        st.success(f"Image successfully uploaded and saved at {image_path}")
                        st.image(image_path, caption="Uploaded Image", use_column_width=True)
                    else:
                        st.warning("Please upload an image and enter a subscriber number.")

                # Persist the mode selection across reloads
                mode = st.radio(
                    "Choose organisation:", 
                    ["Government", "Agriculture"], 
                    index=["Government", "Agriculture"].index(st.session_state.mode),
                    horizontal=True
                )
                st.write('___')

                # Update the mode in session_state if changed
                if mode != st.session_state.mode:
                    st.session_state.mode = mode  # Store the new mode in session_state
                    st.rerun()

                myCol1, myCol2 = st.columns([1, 10])
                if mode == "Government":
                    with myCol1:
                        base64_img = get_base64_image("./images/Government.png")
                        st.markdown(
                            f"""
                            <div style="text-align: right;">
                                <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                            </div>
                            """,
                            unsafe_allow_html=True
                        )
                    
                    with myCol2:
                        # Center the header text
                        st.markdown(
                            """
                            <div style="text-align: center;">
                                <h1>🇿🇼 Yamurai/Sizani Government Civil Protection 🇿🇼</h1>
                                <h3>Emergency Response • Disaster Management • Public Safety</h3>
                            </div>
                            """,
                            unsafe_allow_html=True
                        )
                    st.write('')
                    st.write('')
                    st.write('')
                    imagePrompt, textVoicePrompt = st.columns([1, 3])
                    with textVoicePrompt:
                        user_input = st.text_input("Ask about emergency protocols, disaster management, or public safety:", value=st.session_state.user_input, key="user_input", )
                        st.write("Make a voice prompt for emergency reporting")
                        voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True, key="queryRecording")
                    with imagePrompt:
                        # Upload image
                        uploaded_file = st.file_uploader("Upload emergency situation image", type=["jpg", "jpeg", "png"], key="imageUploader")
                    st.write('___')
                elif mode == "Agriculture":
                    with myCol1:
                        base64_img = get_base64_image("./images/Agriculture.png")
                        st.markdown(
                            f"""
                            <div style="text-align: right;">
                                <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                            </div>
                            """,
                            unsafe_allow_html=True
                        )

                    with myCol2:
                        # Center the header text
                        st.markdown(
                            """
                            <div style="text-align: center;">
                                <h1>🌾 Yamurai/Sizani Agricultural Civil Protection 🌾</h1>
                                <h3>Weather Alerts • Crop Disease Warnings • Farming Safety</h3>
                            </div>
                            """,
                            unsafe_allow_html=True
                        )
                    st.write('')
                    st.write('')
                    st.write('')
                    imagePrompt, textVoicePrompt = st.columns([1, 3])
                    with textVoicePrompt:
                        user_input = st.text_input("Ask about weather alerts, crop diseases, or farming safety:", value=st.session_state.user_input, key="user_input", )
                        st.write("Make a voice prompt for agricultural emergencies")
                        voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True, key="queryRecording")
                    with imagePrompt:
                        # Upload image
                        uploaded_file = st.file_uploader("Upload crop/field image for analysis", type=["jpg", "jpeg", "png"], key="imageUploader")
                    st.write('___')
                    
                col1, col2, col3 = st.columns([1, 1, 1])
                with col1:
                    send_button = st.button("Send", key="send_button")
                with col2:
                    cancel_button = st.button("Cancel", key="cancel_button")

                if cancel_button:
                    st.session_state.user_input = ''
                    st.rerun()

                if send_button:
                    if user_input:
                        # Choose between government or agriculture based on user input
                        if mode == "Government":
                            organisation = "Government"

                            endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                        
                            response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                            
                            if response.status_code == 200:
                                response_data = response.json()
                                llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                sources = response_data.get("sources", [])
                                                                
                                # Append to chat history
                                st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})
                                
                                # Clear the input box after sending
                                display_chat_history(subscriber_number, userProfilePic)
                            else:
                                st.error("Failed to get a response from Yamurai/Sizani.")

                        elif mode == "Agriculture":
                            organisation = "Agriculture"

                            endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                        
                            response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                            
                            if response.status_code == 200:
                                response_data = response.json()
                                llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                sources = response_data.get("sources", [])
                                
                                # Append to chat history
                                st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})

                                # Clear the input box after sending
                                display_chat_history(subscriber_number, userProfilePic)
                            else:
                                st.error("Failed to get a response from Yamurai/Sizani.")

                        else:
                            endpoint = "http://127.0.0.1:4110/ai"  # Changed port to 4110
                            response = requests.post(endpoint, json={"query": user_input})
                            
                            if response.status_code == 200:
                                response_data = response.json()
                                llm_response = response_data['response']
                                sources = []
                                # Append to chat history
                                st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})
                                # Display the updated chat history
                                display_chat_history(subscriber_number, userProfilePic)
                            else:
                                st.error("Failed to get a response from Yamurai/Sizani.")

                else:
                    if len(st.session_state.chat_history) != 0:
                        display_same_chat_history(subscriber_number, userProfilePic)

                with col3:
                    # Option to clear chat history
                    if st.button("Clear Chat History"):
                        st.session_state.chat_history = []
                        st.rerun()
                
            else:
                if st.session_state.mode != "Reports":
                    # Main Page: LLM Chat Interface
                    st.sidebar.title("Chat Sessions")
                    chat_sessions = ["new_session"] + get_all_chat_history_ids(st.session_state.user_id)   

                    index = chat_sessions.index(st.session_state.session_index_tracker)
                    st.sidebar.selectbox("Select a chat session", chat_sessions, key="session_key", index=index)
                    pdf_toggle_col = st.sidebar
                    pdf_toggle_col.toggle("Yamurai/Sizani Chat", key="yamurai_chat", value=False)
                    delete_chat_col, clear_cache_col = st.sidebar.columns(2)
                    delete_chat_col.button("Delete Chat Session", on_click=delete_chat_session_history)
                    clear_cache_col.button("Clear Session Cache", on_click=clear_cache)

                    st.sidebar.header("Upload Civil Protection Documents")
                    
                    uploaded_files = st.sidebar.file_uploader("Choose emergency plans, policies, or guidelines", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True)
                    
                    profilePicture = st.sidebar.file_uploader("Upload a profile picture", type=["jpeg", "png", "jpg"], key="Profile Picture")

                    modeDB = st.sidebar.selectbox("Choose Database:", ["Government", "Agriculture"])
                    
                    submit_button = st.sidebar.button("Submit")

                    if submit_button and uploaded_files and modeDB:
                        uploadHandler(subscriber_number, uploaded_files, modeDB)
                    elif submit_button and profilePicture:
                        save_uploaded_image(profilePicture, subscriber_number)
                        image_path = save_uploaded_image(profilePicture, subscriber_number)
                        if image_path:
                            st.success(f"Image successfully uploaded and saved at {image_path}")
                            st.image(image_path, caption="Uploaded Image", use_column_width=True)
                        else:
                            st.warning("Please upload an image and enter a subscriber number.")
                
                else:
                    # Reading file or database information (keep as is for reports)
                    st.sidebar.header("Choose data source")
                    with st.sidebar:                
                        source = st.radio(
                        "Choose  data source:", 
                        ["Flat file", "Database"], 
                        index=["Flat file", "Database"].index(st.session_state.source),
                        horizontal=True
                        )

                        # Update the source in session_state if changed
                        if source != st.session_state.source:
                            st.session_state.source = source  # Store the new source in session_state
                            st.rerun()
                        st.write('___')
                        
                        dfNames = []
                        if source == "Flat file":
                            fl = st.file_uploader(":file_folder: Upload a file", type=(["csv", "txt", "xlsx", "xls"]))
                            if fl is not None:
                                filename = fl.name
                                for i in ["Orders", "Returns", "People"]:
                                    globals()[f'df{i}'] = pd.read_excel(filename, sheet_name = i)
                                    dfNames.append(f'df{i}')
                            else:
                                for i in ["Orders", "Returns", "People"]:
                                    globals()[f'df{i}'] = pd.read_excel(r'C:\Users\ACER\Downloads\Sample - Superstore.xls', sheet_name = i)
                                    dfNames.append(f'df{i}')

                            df = globals()[f'{dfNames[0]}'].merge(globals()[f'{dfNames[2]}'], on = "Region", 
                                                                  how = "inner").merge(globals()[f'{dfNames[1]}'], 
                                                                                       on = "Order ID", how = "left")

                            st.sidebar.header("Filter Selection")
                            subCol1, subCol2 = st.columns(2)

                    df['Returned'] = df['Returned'].fillna("No")
                    df['Order Date'] = pd.to_datetime(df['Order Date'])

                    startDate = df['Order Date'].min()
                    endDate = df['Order Date'].max()

                    with subCol1:
                        date1 = pd.to_datetime(st.date_input("Start Date", startDate))
                    with subCol2:
                        date2 = pd.to_datetime(st.date_input("End Date", endDate))                                

                    df = df[(df['Order Date'] >= date1) & (df['Order Date'] <= date2)].copy()

                    region = st.sidebar.multiselect("Select region", df["Region"].unique())
                    if not region:
                        df2 = df.copy()
                    else:
                        df2 = df[df["Region"].isin(region)]

                    state = st.sidebar.multiselect("Select Province", df2["State"].unique())
                    if not state:
                        df3 = df2.copy()
                    else:
                        df3 = df2[df2["State"].isin(state)]

                    city = st.sidebar.multiselect("Town/City Selection", df3["City"].unique())
                    if not city:
                        df4 = df3.copy()
                    else:
                        df4 = df3[df3["City"].isin(city)]

                    if not region and not state and not city:
                        filtered_df = df
                    elif not state and not city: #Region
                        filtered_df = df2
                    elif not region and not city: #if State
                        filtered_df = df[df['State'].isin(state)]
                    elif not state and not region: # if City
                        filtered_df = df[df['City'].isin(city)]
                    elif region and state: # If Region and State
                        filtered_df = df3
                    elif state and city: # If State and City
                        filtered_df = df[(df['City'].isin(city)) & (df['State'].isin(state))]
                    elif region and city: # If Region and City
                        filtered_df = df[(df['City'].isin(city)) & (df['Region'].isin(region))]
                    else:
                        filtered_df = df4

                if st.session_state.jobTitle not in ["Deputy General Manager"]:
                    # Persist the mode selection across reloads
                    mode = st.radio(
                        "Choose organisation:", 
                        ["Government", "Agriculture"], 
                        index=["Government", "Agriculture"].index(st.session_state.mode),
                        horizontal=True
                    )
                    st.write('___')

                    # Update the mode in session_state if changed
                    if mode != st.session_state.mode:
                        st.session_state.mode = mode  # Store the new mode in session_state
                        st.rerun()

                    myCol1, myCol2 = st.columns([1, 10])
                    if mode == "Government":
                        with myCol1:
                            base64_img = get_base64_image("./images/Government.png")
                            st.markdown(
                                f"""
                                <div style="text-align: right;">
                                    <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                                </div>
                                """,
                                unsafe_allow_html=True
                            )

                        with myCol2:
                            # Center the header text
                            st.markdown(
                                """
                                <div style="text-align: center;">
                                    <h1>🇿🇼 Yamurai/Sizani Government Civil Protection 🇿🇼</h1>
                                    <h3>Emergency Response • Disaster Management • Public Safety</h3>
                                </div>
                                """,
                                unsafe_allow_html=True
                            )
                        st.write('')
                        st.write('')
                        st.write('')
                        imagePrompt, textVoicePrompt = st.columns([1, 3])
                        with textVoicePrompt:
                            user_input = st.text_input("Ask about emergency protocols, disaster management, or public safety:", value=st.session_state.user_input, key="user_input", )
                            st.write("Make a voice prompt for emergency reporting")
                            voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True, key="queryRecording")
                        with imagePrompt:
                            # Upload image
                            uploaded_file = st.file_uploader("Upload emergency situation image", type=["jpg", "jpeg", "png"], key="imageUploader")
                        st.write('___')
                        
                    elif mode == "Agriculture":
                        with myCol1:
                            base64_img = get_base64_image("./images/Agriculture.png")
                            st.markdown(
                                f"""
                                <div style="text-align: right;">
                                    <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                                </div>
                                """,
                                unsafe_allow_html=True
                            )

                        with myCol2:
                            # Center the header text
                            st.markdown(
                                """
                                <div style="text-align: center;">
                                    <h1>🌾 Yamurai/Sizani Agricultural Civil Protection 🌾</h1>
                                    <h3>Weather Alerts • Crop Disease Warnings • Farming Safety</h3>
                                </div>
                                """,
                                unsafe_allow_html=True
                            )
                        st.write('')
                        st.write('')
                        st.write('')
                        imagePrompt, textVoicePrompt = st.columns([1, 3])
                        with textVoicePrompt:
                            user_input = st.text_input("Ask about weather alerts, crop diseases, or farming safety:", value=st.session_state.user_input, key="user_input", )
                            st.write("Make a voice prompt for agricultural emergencies")
                            voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True)
                        with imagePrompt:
                            # Upload image
                            uploaded_file = st.file_uploader("Upload crop/field image for analysis", type=["jpg", "jpeg", "png"], key="imageUploader")
                        st.write('___')
                        
                    col1, col2, col3 = st.columns([1, 1, 1])
                    with col1:
                        send_button = st.button("Send", key="send_button")
                    with col2:
                        cancel_button = st.button("Cancel", key="cancel_button")

                    if cancel_button:
                        st.session_state.user_input = ''
                        st.rerun()

                    if send_button:
                        if user_input:
                            # Choose between government or agriculture based on user input
                            if mode == "Government":
                                organisation = "Government"

                                endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                            
                                response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                                
                                if response.status_code == 200:
                                    response_data = response.json()
                                    llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                    sources = response_data.get("sources", [])
                                    
                                    # Append to chat history
                                    st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})

                                    # Clear the input box after sending
                                    display_chat_history(subscriber_number, userProfilePic)
                                else:
                                    st.error("Failed to get a response from Yamurai/Sizani.")

                            elif mode == "Agriculture":
                                organisation = "Agriculture"

                                endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                            
                                response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                                
                                if response.status_code == 200:
                                    response_data = response.json()
                                    llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                    sources = response_data.get("sources", [])
                                    
                                    # Append to chat history
                                    st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})

                                    # Clear the input box after sending
                                    display_chat_history(subscriber_number, userProfilePic)
                                else:
                                    st.error("Failed to get a response from Yamurai/Sizani.")

                            else:
                                endpoint = "http://127.0.0.1:4110/ai"  # Changed port to 4110
                                response = requests.post(endpoint, json={"query": user_input})
                                
                                if response.status_code == 200:
                                    response_data = response.json()
                                    llm_response = response_data['response']
                                    sources = []
                                    # Append to chat history
                                    st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})
                                    # Display the updated chat history
                                    display_chat_history(subscriber_number, userProfilePic)
                                else:
                                    st.error("Failed to get a response from Yamurai/Sizani.")
                    else:
                        if len(st.session_state.chat_history) != 0:
                            display_same_chat_history(subscriber_number, userProfilePic)

                else:
                    # Persist the mode selection across reloads
                    mode = st.radio(
                        "Choose organisation:", 
                        ["Government", "Agriculture", "Reports"], 
                        index=["Government", "Agriculture", "Reports"].index(st.session_state.mode),
                        horizontal=True
                    )
                    st.write('___')

                    # Update the mode in session_state if changed
                    if mode != st.session_state.mode:
                        st.session_state.mode = mode  # Store the new mode in session_state
                        st.rerun()

                    myCol1, myCol2 = st.columns([1, 10])
                    if mode == "Reports":
                        # Get today's date in the desired format
                        today = datetime.now().strftime("%d %B %Y")

                        # Set page title
                        with myCol1:
                                base64_img = get_base64_image("./images/Yamurai.png")
                                st.markdown(
                                    f"""
                                    <div style="text-align: left;">
                                        <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )

                        with myCol2:
                            st.title(f"Yamurai/Sizani Civil Protection Performance Report as at {today}")
                            st.markdown('<style> div.block-container {padding-top:1rem; text-align: center;} </style>', unsafe_allow_html=True)
                        st.write('')
                        st.write('')
                        st.write('')

                        # Keep the existing reports functionality but rename headers for civil protection context
                        category_df = filtered_df.groupby(by = ['Category'], as_index = False)["Sales"].sum()
                        newCol, newCol2 = st.columns(2)
                        with newCol:
                            st.subheader("Emergency Response by Category")
                            fig = px.bar(category_df, x="Category", y="Sales", text=['${:,.2f}'.format(x) for x in category_df['Sales']],
                                            template='seaborn')
                            st.plotly_chart(fig, use_container_width=True, height = 200)

                        with newCol2:
                            st.subheader("Incidents by Region")
                            fig = px.pie(filtered_df, values= "Sales", names= 'Region', hole=0.5)
                            fig.update_traces(text = filtered_df["Region"], textposition = "outside")
                            st.plotly_chart(fig, use_container_width=True) 

                        cl1, cl2 = st.columns(2)
                        with cl1:
                            with st.expander("Category_ViewData"):
                                st.write(category_df.style.background_gradient(cmap="Blues").set_properties(**{'width': '100%'}))
                                csv = category_df.to_csv(index = False).encode('utf-8')
                                st.download_button("Download data", data = csv, file_name="Category.csv", mime="text/csv",
                                                   help = "Click button to download the data as a CSV file")
                                
                        with cl2:
                            with st.expander("Region_ViewData"):
                                region_df = filtered_df.groupby(by = ['Region'], as_index = False)["Sales"].sum()
                                st.write(region_df.style.background_gradient(cmap="Oranges").set_properties(**{'width': '100%'}))
                                csv = region_df.to_csv(index = False).encode('utf-8')
                                st.download_button("Download data", data = csv, file_name="Region.csv", mime="text/csv",
                                                   help = "Click button to download the data as a CSV file")

                        filtered_df["month_year"] = filtered_df['Order Date'].dt.to_period("M")
                        st.subheader("Time Series Analysis - Emergency Incidents")

                        view = st.radio(
                            "Select View:",
                            ["Overall Incident Trend", "Monthly Incident Comparison"],
                            index=0,  # Default selection
                            horizontal=True
                        )

                        if view == "Overall Incident Trend":
                            # Line Chart for Time Series
                            linechart = pd.DataFrame(
                                filtered_df.groupby(filtered_df["month_year"].dt.strftime("%Y : %b"))["Sales"].sum()
                            ).reset_index()
                            fig2 = px.line(
                                linechart,
                                x="month_year",
                                y="Sales",
                                labels={"Sales": "Number of Incidents"},
                                height=500,
                                width=850,
                                template="gridon",
                                title="Overall Incident Trend"
                            )
                            st.plotly_chart(fig2, use_container_width=True)

                            with st.expander("View TimeSeries Data"):
                                st.write(linechart.T.style.background_gradient(cmap="Blues").set_properties(**{'width': '100%'}))
                                csv = linechart.to_csv(index = False).encode('utf-8')
                                st.download_button("Download data", data = csv, file_name="Timeseries.csv", mime="text/csv",
                                                    help = "Click button to download the data as a CSV file")

                        elif view == "Monthly Incident Comparison":
                            # Bar Chart for Monthly Sales Comparison by Year
                            filtered_df["Year"] = filtered_df["Order Date"].dt.year
                            filtered_df["Month"] = filtered_df["Order Date"].dt.strftime("%B")
                            month_order = [ "January", "February", "March", "April", "May", "June", "July", "August", "September",
                                            "October", "November", "December"]
                            filtered_df["Month"] = pd.Categorical(filtered_df["Month"], categories=month_order, ordered=True)
                            comparison_chart = filtered_df.groupby(["Year", "Month"])["Sales"].sum().reset_index()
                            comparison_chart["Month"] = pd.Categorical(comparison_chart["Month"],
                                                                    categories=[
                                                                        "January", "February", "March", "April", "May", "June",
                                                                        "July", "August", "September", "October", "November", "December"
                                                                    ],
                                                                    ordered=True)
                            comparison_chart = comparison_chart.sort_values(["Year", "Month"])
                            # Line Chart for Monthly Sales Comparison by Year
                            comparison_chart = filtered_df.groupby(["Year", "Month"])["Sales"].sum().reset_index()

                            fig4 = px.line(
                                comparison_chart,
                                x="Month",
                                y="Sales",
                                color="Year",
                                labels={"Sales": "Number of Incidents", "Month": "Month"},
                                template="gridon",
                                title="Monthly Incident Comparison by Year",
                                markers=True
                            )
                            st.plotly_chart(fig4, use_container_width=True) 

                            with st.expander("View TimeSeries Data"):
                                st.write(comparison_chart.T.style.background_gradient(cmap="Blues").set_properties(**{'width': '100%'}))
                                csv = comparison_chart.to_csv(index = False).encode('utf-8')
                                st.download_button("Download data", data = csv, file_name="Comparison Chart.csv", mime="text/csv",
                                                    help = "Click button to download the data as a CSV file")

                        st.subheader("Hierarchical view of Incidents using TreeMap")
                        fig3 = px.treemap(filtered_df, path=["Region", "Category", "Sub-Category"], values="Sales", hover_data="Sales", 
                                          color="Sub-Category")
                        fig3.update_layout(width=850, height = 650)
                        st.plotly_chart(fig3, use_container_width=True)

                        chart1, chart2 = st.columns(2)
                        with chart1:
                            st.subheader("Incidents by Segment")
                            fig = px.pie(filtered_df, values= "Sales", names="Segment", template="plotly_dark")
                            fig.update_traces(text = filtered_df["Segment"], textposition = "inside")
                            st.plotly_chart(fig, use_container_width=True)  

                        with chart2:
                            st.subheader("Incidents by Category")
                            fig = px.pie(filtered_df, values= "Sales", names="Category", template="gridon")
                            fig.update_traces(text = filtered_df["Category"], textposition = "inside")
                            st.plotly_chart(fig, use_container_width=True)   

                        st.subheader(":point_right: Monthly Incident Summary by Sub-Category")
                        with st.expander("Summary Table"):
                            df_sample = df[0:5][["Region", "State", "City", "Category", "Quantity", "Sales", "Profit"]]
                            fig = ff.create_table(df_sample, colorscale="Cividis")
                            st.plotly_chart(fig, use_container_width=True) 

                            st.markdown("Monthly Incident Table by Sub-Category")
                            sub_category_year = pd.pivot_table(data=filtered_df, values="Sales", index=["Sub-Category"], 
                                                               columns="Month")
                            st.write(sub_category_year.style.background_gradient(cmap="Blues"))

                        data1 = px.scatter(filtered_df, x="Sales", y="Profit", size="Quantity")
                        data1['layout'].update(title = "Incident Response Scatterplot", titlefont = dict(size=20), 
                                               xaxis = dict(title="Number of Incidents", titlefont = dict(size=19)), 
                                               yaxis = dict(title="Response Effectiveness", titlefont = dict(size=19)))
                        st.plotly_chart(data1, use_container_width=True)

                        with st.expander("View Data"):
                            st.write(filtered_df.iloc[:500,1:20:2].style.background_gradient(cmap="Oranges")) 

                    else:
                        if mode == "Government":
                            with myCol1:
                                base64_img = get_base64_image("./images/Government.png")
                                st.markdown(
                                    f"""
                                    <div style="text-align: right;">
                                        <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )

                            with myCol2:
                                # Center the header text
                                st.markdown(
                                    """
                                    <div style="text-align: center;">
                                        <h1>🇿🇼 Yamurai/Sizani Government Civil Protection 🇿🇼</h1>
                                        <h3>Emergency Response • Disaster Management • Public Safety</h3>
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )
                            st.write('')
                            st.write('')
                            st.write('')
                            imagePrompt, textVoicePrompt = st.columns([1, 3])
                            with textVoicePrompt:
                                user_input = st.text_input("Ask about emergency protocols, disaster management, or public safety:", value=st.session_state.user_input, key="user_input", )
                                st.write("Make a voice prompt for emergency reporting")
                                voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True, key="queryRecording")
                            with imagePrompt:
                                # Upload image
                                uploaded_file = st.file_uploader("Upload emergency situation image", type=["jpg", "jpeg", "png"], key="imageUploader")
                            st.write('___')
                            
                        elif mode == "Agriculture":
                            with myCol1:
                                base64_img = get_base64_image("./images/Agriculture.png")
                                st.markdown(
                                    f"""
                                    <div style="text-align: right;">
                                        <img src="data:image/png;base64,{base64_img}" style="width:100%;">
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )

                            with myCol2:
                                # Center the header text
                                st.markdown(
                                    """
                                    <div style="text-align: center;">
                                        <h1>🌾 Yamurai/Sizani Agricultural Civil Protection 🌾</h1>
                                        <h3>Weather Alerts • Crop Disease Warnings • Farming Safety</h3>
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )
                            st.write('')
                            st.write('')
                            st.write('')
                            imagePrompt, textVoicePrompt = st.columns([1, 3])
                            with textVoicePrompt:
                                user_input = st.text_input("Ask about weather alerts, crop diseases, or farming safety:", value=st.session_state.user_input, key="user_input", )
                                st.write("Make a voice prompt for agricultural emergencies")
                                voice_recording = mic_recorder(start_prompt="Record Audio",stop_prompt="Stop recording", just_once=True, key="queryRecording")
                            with imagePrompt:
                                # Upload image
                                uploaded_file = st.file_uploader("Upload crop/field image for analysis", type=["jpg", "jpeg", "png"], key="imageUploader")
                            st.write('___')
                            
                        col1, col2, col3 = st.columns([1, 1, 1])
                        with col1:
                            send_button = st.button("Send", key="send_button")
                        with col2:
                            cancel_button = st.button("Cancel", key="cancel_button")

                        if cancel_button:
                            st.session_state.user_input = ''
                            st.rerun()

                        if send_button:
                            if user_input:
                                # Choose between government or agriculture based on user input
                                if mode == "Government":
                                    organisation = "Government"

                                    endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                                
                                    response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                                    
                                    if response.status_code == 200:
                                        response_data = response.json()
                                        llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                        sources = response_data.get("sources", [])
                                        
                                        # Append to chat history
                                        st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})

                                        # Clear the input box after sending
                                        display_chat_history(subscriber_number, userProfilePic)
                                    else:
                                        st.error("Failed to get a response from Yamurai/Sizani.")

                                elif mode == "Agriculture":
                                    organisation = "Agriculture"

                                    endpoint = "http://127.0.0.1:4110/dbQuerying"  # Changed port to 4110
                                
                                    response = requests.post(endpoint, json={"organisation":organisation, "query": user_input})
                                    
                                    if response.status_code == 200:
                                        response_data = response.json()
                                        llm_response = response_data.get("answer", "No response from Yamurai/Sizani")
                                        sources = response_data.get("sources", [])
                                        
                                        # Append to chat history
                                        st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})

                                        # Clear the input box after sending
                                        display_chat_history(subscriber_number, userProfilePic)
                                    else:
                                        st.error("Failed to get a response from Yamurai/Sizani.")

                                else:
                                    endpoint = "http://127.0.0.1:4110/ai"  # Changed port to 4110
                                    response = requests.post(endpoint, json={"query": user_input})
                                    
                                    if response.status_code == 200:
                                        response_data = response.json()
                                        llm_response = response_data['response']
                                        sources = []
                                        # Append to chat history
                                        st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources":sources})
                                        # Display the updated chat history
                                        display_chat_history(subscriber_number, userProfilePic)
                                    else:
                                        st.error("Failed to get a response from Yamurai/Sizani.")

                        else:
                            if len(st.session_state.chat_history) != 0:
                                display_same_chat_history(subscriber_number, userProfilePic)

                        # Option to clear chat history
                        with col3:
                            if st.button("Clear Chat History"):
                                st.session_state.chat_history = []
                                st.rerun()
    else:
        st.set_page_config(
            page_title="Yamurai/Sizani - AI Civil Protection",
            page_icon="images/Yamurai.png"
        )

        st.markdown(css, unsafe_allow_html=True)
        st.image("images/Yamurai.png", use_column_width=True)
        st.title("Yamurai/Sizani - AI Civil Protection Chatbot")

        login_mode = st.selectbox("Choose Login Mode:", ["Log in", "Sign Up", "Forgot Password"])

        if login_mode == "Log in":
            handle_login()

        elif login_mode == "Sign Up":
            handle_registration()

        else:
            handle_password_reset()
    
if __name__ == "__main__":
    main()