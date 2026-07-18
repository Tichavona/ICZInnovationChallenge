import streamlit.components.v1 as components
import streamlit as st

def main(user_id):
    # Embed the JavaScript file in the HTML, which will collect device info from the user
    # Pass the user_id to the JavaScript code
    components.html(f"""
    <script>
        const UserID = '{user_id}'; // Pass the user_id to JavaScript
        // Now you can use UserID in your device_info.js or any other JS code
    </script>
    <script src="http://localhost:3000/device_info.js"></script>
    """, height=0)
