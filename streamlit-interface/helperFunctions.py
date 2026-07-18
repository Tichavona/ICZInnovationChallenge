import streamlit as st
from llmChains import load_normal_chain, load_pdf_chat_chain
from databaseOperations import delete_chat_history
from utils import get_timestamp

def load_chain():
    if st.session_state.pdf_chat:
        print("loading pdf chat chain")
        return load_pdf_chat_chain()
    return load_normal_chain()

def toggle_pdf_chat():
    st.session_state.pdf_chat = True
    clear_cache()

def get_session_key():
    if st.session_state.session_key == "new_session":
        st.session_state.new_session_key = get_timestamp()
        return st.session_state.new_session_key
    return st.session_state.session_key

def delete_chat_session_history():
    delete_chat_history(st.session_state.session_key)
    st.session_state.session_index_tracker = "new_session"

def clear_cache():
    st.cache_resource.clear()