import streamlit as st
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
config = load_config()

auth = UserAuth(db_conn_str=connString()[0])

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
    # Ensure 'mode' is initialized in session_state
    if 'mode' not in st.session_state:
        st.session_state.mode = "My Data"  # Default to "My Data"

    if st.session_state.authenticated:
        subscriber_number = auth.get_subscriber_number(st.session_state.user_id)
        st.set_page_config(page_title="Zimpapers muntuGPT", page_icon="./images/Zimpapers.png")
        st.write(css, unsafe_allow_html=True)

        st.sidebar.write(f"Welcome, {st.session_state.user_name}")
        st.sidebar.image("./images/Welcome.jpg", use_column_width=True)

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

            st.rerun()

        if (st.session_state.on_landing_page) & (st.session_state.userType == 'External'):
            st.title("Welcome to Zimpapers muntuGPT Reseach Assistant")
            st.write("""
                **About Zimpapers muntuGPT AI Assistant:**  
                Muntu Assistant is an AI-powered tool designed to assist you with research from archived and latest Zimpapers
                vast publications. It is also a multi-disciplinary assistant for academic and general knowledge. Importantly, being a 
                language expert of Africa's indigenous languages and muntuGPT can help with translation tasks for selected popular African
                languages in various modalities of choice. If the assistant lacks specific knowledge in any interest area, please feel free
                to give that valuable feedback here.

                **Use Cases:**  
                - Research assistant for Zimpapers all titles publications since 1892 to date.
                - Academic assistant for scholars and parents to help with homework and educational requirements for Zimbabwean curriculum specifically.
                - Intelligent assistant to help with analysis of your documents privately. Ask questions to your documents 
                - Knowledgeable companion to chat with during quiet time and those lonely moments.

                **Functionality:**  
                - Upload and interact with documents.
                - Academic assistant.
                - Engage in conversation with specialized bots.

                **Get Started:**  
                Click the button below to start chatting with muntuGPT assistant.
            """)

            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        elif (st.session_state.on_landing_page) & (st.session_state.userType != 'External'):
            st.title("Welcome to Zimpapers muntuGPT Assistant...Let's work the smart way")
            st.write("""
                **About Zimpapers muntuGPT AI Assistant:**  
                Muntu Assistant is an AI-powered tool designed to assist you in various tasks, 
                from general information queries to interacting with Zimpapers' documents, knowledge centre, 
                and databases. It offers versatile functionality through multiple language models, 
                tailored to your specific needs.

                **Use Cases:**  
                - Chat with assistant for broad inquiries about the world around us.
                - Query organisational documents like manuals, knowledge centre, reports, presentations, and data.
                - Access specific databases for detailed analysis and information retrieval.
                - Research the internet for specific topic and information of interest.
                - Management tool to support informed decision making 

                **Functionality:**  
                - Upload and interact with documents privately.
                - Query specific company databases and documents.
                - Engage in conversation with specialised assistant.

                **Get Started:**  
                Click the button below to start chatting with muntuGPT assistant.
            """)

            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        else:
            if (st.session_state.userType == 'External'):

                # Side bar config
                    # Logo
                    # Welcome Note
                        # Welcome User by first and Lase Name
                    # Chat History management
                        # New chat session 
                        # Select chat Session
                        # Delete Chat Session
                    # load own data
                        # Upload file selection [Multiple selection, formats]
                        # Submit
                        # Processing and confirmation of processing
                            # With Spinner                

                # Main page Config
                    # Page title change based on Query database selected
                    # Page icon/Logo
                    # Split page into two columns
                    # With column 1
                        # Prompt and query data [Options of "Customer Assistant", "Knowledge Base", "Own Data"]
                        # Display past convo depending on selected chat session
                        # Save new chat session and select title best summarising first convo
                        # Allow multimodal querying of source, that is, voice, text, image
                        # Multimodal response
                        # Sources and references
                        # Preview and download articles
                        # Payment processing for download
                    # with column 2
                        # GPS coordinates foe user
                        # Get closest newspaper selling point
                        # Advertise latest news content   

                pass
                
            else:
                
                pass
    else:
        st.set_page_config(
            page_title="Zimpapers muntuGPT",
            page_icon="images/Zimpapers.png"
        )

        st.markdown(css, unsafe_allow_html=True)
        st.image("images/Zimpapers.png", use_column_width=True)
        st.title("Zimpapers MuntuGPT Assistant Login")

        login_mode = st.selectbox("Choose Login Mode:", ["Log in", "Sign Up", "Forgot Password"])

        if login_mode == "Log in":
            handle_login()

        elif login_mode == "Sign Up":
            handle_registration()

        else:
            handle_password_reset()
    
if __name__ == "__main__":
    main()