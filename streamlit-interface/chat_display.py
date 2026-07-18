import os
import requests
from uploadHandler import uploadHandler
import shutil
import streamlit as st
import base64
import shutil
from htmlTemplate import css, bot_template, user_template


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

class ChatHistoryDisplay:
    def __init__(self, subscriber_number, chat_history):
        self.subscriber_number = subscriber_number
        self.chat_history = chat_history
        self.temp_directory = f"./temp{subscriber_number}"
        self.base_directory = "C:/Users/ACER/Documents/DecisionEdgeConcepts/CorporateGPT2/CorporateGPT2/pdfUploads"

    def display(self):
        """Display the chat history with grouped source files."""
        self._clear_temp_folder()
        for idx, chat in enumerate(reversed(self.chat_history)):
            self._display_chat_message(chat)
            if "sources" in chat and chat["sources"]:
                st.markdown("**Sources:**")
                grouped_sources = self._group_sources_by_filename(chat["sources"])
                self._display_files_in_columns(grouped_sources, idx)

    def _clear_temp_folder(self):
        """Delete the temporary directory if it exists."""
        if os.path.exists(self.temp_directory):
            shutil.rmtree(self.temp_directory)
        os.makedirs(self.temp_directory, exist_ok=True)

    def _display_chat_message(self, chat):
        """Display individual chat messages."""
        if "user" in chat:
            st.write(user_template.replace("{{MSG}}", chat["user"]), unsafe_allow_html=True)
        if "llm" in chat:
            st.write(bot_template.replace("{{MSG}}", chat["llm"]), unsafe_allow_html=True)

    def _group_sources_by_filename(self, sources):
        """Group sources by their file names."""
        grouped_sources = {}
        for source in sources:
            file_name = os.path.basename(source["source"])
            if file_name not in grouped_sources:
                grouped_sources[file_name] = []
            grouped_sources[file_name].append({
                "Page number": source["Page number"],
                "Page Content": source["Page Content"]
            })
        return grouped_sources

    def _display_files_in_columns(self, grouped_sources, chat_index):
        """Display files in two columns with options for refresh and download."""
        file_names = list(grouped_sources.keys())
        for i in range(0, len(file_names), 2):
            col1, col2 = st.columns(2)
            if i < len(file_names):
                self._display_file_in_column(file_names[i], grouped_sources, col1, chat_index, col_key="col1")
            if i + 1 < len(file_names):
                self._display_file_in_column(file_names[i + 1], grouped_sources, col2, chat_index, col_key="col2")

    def _display_file_in_column(self, file_name, grouped_sources, column, chat_index, col_key):
        """Display a single file in a given column with refresh and download options."""
        temp_pdf_path = os.path.join(self.temp_directory, file_name)
        original_file_path = os.path.join(self.base_directory, file_name)
        
        if not copy_file_to_temp(original_file_path, temp_pdf_path):
            st.error(f"Unable to copy and display PDF for {file_name}")
            return

        with column:
            base64_pdf = encode_pdf(temp_pdf_path)
            unique_key = f"{file_name}-{col_key}-{chat_index}"
            displayPDF(temp_pdf_path, unique_key, base64_pdf=base64_pdf)
            self._add_column_buttons(file_name, unique_key, base64_pdf, column)

    def _add_column_buttons(self, file_name, unique_key, base64_pdf, column):
        """Add refresh and download buttons below the PDF display."""
        button_col1, button_col2 = column.columns(2)

        with button_col1:
            if st.button("Refresh Preview", key=f"refresh-{unique_key}"):
                st.markdown(f"""
                    <script>
                        document.getElementById('pdf-frame-{unique_key}').src += '';
                    </script>
                """, unsafe_allow_html=True)

        with button_col2:
            if st.button("Download File", key=f"download-{unique_key}"):
                if payment_successful():
                    download_link = f'<a href="data:application/pdf;base64,{base64_pdf}" download="{file_name}">Click here to download</a>'
                    st.success("Payment successful! Please download your file below.")
                    st.markdown(download_link, unsafe_allow_html=True)
                else:
                    st.error("Payment failed. Please try again.")

# Usage example:
# chat_display = ChatHistoryDisplay(subscriber_number="12345", chat_history=st.session_state.chat_history)
# chat_display.display()


class ChatView:
    def __init__(self, subscriber_number, user_type):
        self.subscriber_number = subscriber_number
        self.user_type = user_type

    def render_view(self):
        if self.user_type == 'External':
            self.render_external_view()
        else:
            self.render_internal_view()

    def render_external_view(self):
        st.sidebar.title("Chat Sessions")
        self.display_chat_sessions()
        st.sidebar.header("Upload your own Documents to analyze and chat with?")
        uploaded_files = st.sidebar.file_uploader("Choose a file", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True)
        modeDB = st.sidebar.selectbox("Choose Database:", ["My Data"])
        submit_button = st.sidebar.button("Submit")

        if submit_button and uploaded_files and modeDB:
            uploadHandler(self.subscriber_number, uploaded_files, modeDB)

        self.select_mode(["My Data", "Knowledge Centre", "Customer Service Assistant"])

    def render_internal_view(self):
        st.sidebar.header("Upload Documents and Connect to Database")
        uploaded_files = st.sidebar.file_uploader("Choose a file", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True)
        modeDB = st.sidebar.selectbox("Choose Database:", ["My Data", "Knowledge Centre", "Procedure and Policies", "Customer Service Assistant"])
        submit_button = st.sidebar.button("Submit")

        if submit_button and uploaded_files and modeDB:
            uploadHandler(self.subscriber_number, uploaded_files, modeDB)

        self.select_mode(["My Data", "Knowledge Centre", "Customer Service Assistant", "Procedure and Policies"])

    def display_chat_sessions(self):
        chat_sessions = ["new_session"] + get_all_chat_history_ids(st.session_state.user_id)
        index = chat_sessions.index(st.session_state.session_index_tracker)
        st.sidebar.selectbox("Select a chat session", chat_sessions, key="session_key", index=index)

        pdf_toggle_col, voice_rec_col = st.sidebar.columns(2)
        pdf_toggle_col.toggle("PDF Chat", key="pdf_chat", value=False)
        with voice_rec_col:
            mic_recorder(start_prompt="Record Audio", stop_prompt="Stop recording", just_once=True)

        delete_chat_col, clear_cache_col = st.sidebar.columns(2)
        delete_chat_col.button("Delete Chat Session", on_click=delete_chat_session_history)
        clear_cache_col.button("Clear Cache", on_click=clear_cache)

    def select_mode(self, mode_options):
        mode = st.selectbox("Choose mode:", mode_options, index=mode_options.index(st.session_state.mode))

        if mode != st.session_state.mode:
            st.session_state.mode = mode

        # Set page layout based on selected mode
        if mode == "My Data":
            st.image("./images/Welcome.jpg", use_column_width=True)
            st.header("You are utilizing Zimpapers muntuGPT to chat with your private data 📰")
        elif mode == "Knowledge Centre":
            st.image("./images/Zimpapers.png", use_column_width=True)
            st.header("Welcome to Zimpapers Knowledge Centre with muntuGPT Assistant :books:")
        elif mode == "Procedure and Policies":
            st.image("./images/Zimpapers.png", use_column_width=True)
            st.header("Chat with Zimpapers Group Policy and Procedures documents 📰")
        elif mode == "Customer Service Assistant":
            st.image("./images/Zimpapers.png", use_column_width=True)
            st.header("Chat with Zimpapers muntuGPT Customer Service Assistant 📰")

        user_input = st.text_input("Ask something:", value=st.session_state.user_input, key="user_input")
        col1, col2 = st.columns([1, 1])

        with col1:
            send_button = st.button("Send", key="send_button")
        with col2:
            cancel_button = st.button("Cancel", key="cancel_button")

        if cancel_button:
            st.session_state.user_input = ''
            st.rerun()

        if send_button:
            self.handle_chat_submission(user_input, mode)

    def handle_chat_submission(self, user_input, mode):
        if user_input:
            endpoint_map = {
                "My Data": "http://127.0.0.1:8080/dbQuerying",
                "Knowledge Centre": "http://127.0.0.1:8080/dbQuerying",
                "Procedure and Policies": "http://127.0.0.1:8080/dbQuerying",
                "Customer Service Assistant": "http://127.0.0.1:8080/dbQuerying",
                "General": "http://127.0.0.1:8080/ai"
            }
            organisation_map = {
                "My Data": self.subscriber_number,
                "Knowledge Centre": "Zimpapers",
                "Procedure and Policies": "zimpapersPL",
                "Customer Service Assistant": "csAssistant",
                "General": None
            }

            endpoint = endpoint_map.get(mode, endpoint_map["General"])
            organisation = organisation_map.get(mode, None)
            query_payload = {"organisation": organisation, "query": user_input} if organisation else {"query": user_input}
            response = requests.post(endpoint, json=query_payload)

            if response.status_code == 200:
                response_data = response.json()
                llm_response = response_data.get("answer", "No response from LLM")
                sources = response_data.get("sources", [])
                st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})
                display_chat_history(self.subscriber_number)
            else:
                st.error("Failed to get a response from the model.")

def main():
    # Check if user is authenticated and has valid session data
    if st.session_state.authenticated:
        subscriber_number = auth.get_subscriber_number(st.session_state.user_id)
        user_type = st.session_state.userType  # Retrieve user type from session state

        # Instantiate ChatView based on user type and render appropriate view
        chat_view = ChatView(subscriber_number=subscriber_number, user_type=user_type)
        chat_view.render_view()
    else:
        # Handle authentication or display login page
        st.error("User not authenticated.")
